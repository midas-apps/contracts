import { constants, PopulatedTransaction } from 'ethers';
import { hexZeroPad } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { layerZeroEids, MTokenName, Network } from '../../../../config';
import {
  DepositVaultType,
  midasAddressesPerNetwork,
  RedemptionVaultType,
} from '../../../../config/constants/addresses';
import { deprecatedLzConfigsPerMToken } from '../../../../config/misc';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import {
  getRolesForToken,
  getRolesNamesForToken,
} from '../../../../helpers/roles';
import { DeployFunction, VAULT_FUNCTION_SELECTORS } from '../../common/types';
import { sendAndWaitForCustomTxSign } from '../../common/utils';

/**
 * Decommissions the LZ pathways listed in `deprecatedLzConfigsPerMToken`
 * (config/misc/layerzero.config.ts).
 *
 * Verifies the full on-chain deprecation state on EVERY network of every
 * deprecated pathway in a single run and submits ONLY the transactions that
 * are still required:
 *
 *   1. revokeRoleMult(minter+burner) from the OFT adapters (all networks)
 *   2. setPeer(<remote eid>, bytes32(0)) on the OFT adapters (all networks)
 *
 * The wire task cannot do this - it only ever adds/updates pathways that are
 * present in the config and never removes peers that were dropped from it.
 *
 * On the decommissioned network itself (the outer config key) it additionally
 * reports (read-only) the token/vault pause state, since pausing is handled
 * by the existing tooling (deploy:post:pause:functions) and backoffice.
 *
 * All txs go through the regular Fordefi flow (sendAndWaitForCustomTxSign)
 * and are approved there one by one; this script only submits them in the
 * correct order (role revocations first, peer removal second).
 *
 * Usage:
 *   # dry run (default) - verify everything, print the report and the tx plan
 *   yarn deploy:lz:deprecate --network scroll
 *
 *   # submit the required txs to Fordefi
 *   DRY_RUN=false yarn deploy:lz:deprecate --network scroll
 *
 * The --network flag only bootstraps hardhat; the script itself always
 * operates on every network of every deprecated pathway.
 */

const DEPOSIT_VAULT_TYPES: DepositVaultType[] = [
  'depositVault',
  'depositVaultUstb',
  'depositVaultAave',
  'depositVaultMorpho',
  'depositVaultMToken',
];

const REDEMPTION_VAULT_TYPES: RedemptionVaultType[] = [
  'redemptionVault',
  'redemptionVaultBuidl',
  'redemptionVaultSwapper',
  'redemptionVaultMToken',
  'redemptionVaultUstb',
  'redemptionVaultAave',
  'redemptionVaultMorpho',
];

type PlannedTx = {
  // lower order is submitted first
  order: number;
  description: string;
  hre: HardhatRuntimeEnvironment;
  populatedTx: PopulatedTransaction;
  txSignMetadata: Parameters<typeof sendAndWaitForCustomTxSign>[2];
  safeMiddlewareWallet?: string;
};

const hres: Partial<Record<Network, HardhatRuntimeEnvironment>> = {};

const getHre = async (network: Network) => {
  return (hres[network] ??= await getHreByNetworkName(network));
};

const func: DeployFunction = async () => {
  const dryRun = process.env.DRY_RUN !== 'false';

  const plannedTxs: PlannedTx[] = [];
  const warnings: string[] = [];
  const okChecks: string[] = [];
  const decommissionReport: string[] = [];

  for (const [deprecatedNetworkKey, tokenConfigs] of Object.entries(
    deprecatedLzConfigsPerMToken,
  )) {
    const deprecatedNetwork = deprecatedNetworkKey as Network;

    for (const [mTokenKey, tokenConfig] of Object.entries(tokenConfigs)) {
      const mToken = mTokenKey as MTokenName;

      if (!tokenConfig) continue;

      const allNetworks = [deprecatedNetwork, ...tokenConfig.linkedNetworks];

      for (const network of allNetworks) {
        const label = `${mToken} on ${network}`;

        const networkAddresses = midasAddressesPerNetwork[network];
        const oftAddress = networkAddresses?.[mToken]?.layerZero?.oft;
        const accessControlAddress = networkAddresses?.accessControl;

        if (!oftAddress || !accessControlAddress) {
          warnings.push(
            `${label}: oft or accessControl address is missing in the registry, cannot verify. ` +
              `Run this script BEFORE removing the addresses from addresses.ts`,
          );
          continue;
        }

        const hre = await getHre(network);

        const oft = await hre.ethers.getContractAt(
          'MidasLzMintBurnOFTAdapter',
          oftAddress,
        );
        const accessControl = await hre.ethers.getContractAt(
          'MidasAccessControl',
          accessControlAddress,
        );

        const roles = getRolesForToken(mToken);
        const roleNames = getRolesNamesForToken(mToken);

        // 1. minter/burner roles of the OFT adapter
        const rolesToRevoke: { role: string; name: string }[] = [];

        for (const roleKey of ['minter', 'burner'] as const) {
          const hasRole: boolean = await accessControl.hasRole(
            roles[roleKey],
            oftAddress,
          );

          if (hasRole) {
            rolesToRevoke.push({
              role: roles[roleKey],
              name: roleNames[roleKey],
            });
          } else {
            okChecks.push(`${label}: ${roleNames[roleKey]} is already revoked`);
          }
        }

        if (rolesToRevoke.length > 0) {
          plannedTxs.push({
            order: 1,
            description: `${label}: revoke [${rolesToRevoke
              .map((v) => v.name)
              .join(', ')}] from OFT ${oftAddress}`,
            hre,
            populatedTx: await accessControl.populateTransaction.revokeRoleMult(
              rolesToRevoke.map((v) => v.role),
              rolesToRevoke.map(() => oftAddress),
            ),
            txSignMetadata: {
              mToken,
              action: 'update-ac',
              subAction: 'revoke-token-roles',
              comment: `deprecation: revoke ${mToken} layerzero roles on ${network}`,
            },
          });
        }

        // 2. peer links to every other network of the pathway
        for (const remoteNetwork of allNetworks) {
          if (remoteNetwork === network) continue;

          const remoteEid = layerZeroEids[remoteNetwork];

          if (!remoteEid) {
            throw new Error(`LayerZero eid not found for ${remoteNetwork}`);
          }

          const peer: string = await oft.peers(remoteEid);

          if (peer === constants.HashZero) {
            okChecks.push(
              `${label}: peer to ${remoteNetwork} (eid ${remoteEid}) is already removed`,
            );
            continue;
          }

          const remoteOftAddress =
            midasAddressesPerNetwork[remoteNetwork]?.[mToken]?.layerZero?.oft;
          const expectedPeer = remoteOftAddress
            ? hexZeroPad(remoteOftAddress, 32).toLowerCase()
            : undefined;

          if (expectedPeer && peer.toLowerCase() !== expectedPeer) {
            warnings.push(
              `${label}: peer for eid ${remoteEid} is ${peer}, which does not match ` +
                `the registered remote OFT ${remoteOftAddress}. Removing it anyway`,
            );
          }

          const owner: string = await oft.owner();

          plannedTxs.push({
            order: 2,
            description:
              `${label}: setPeer(${remoteEid}, bytes32(0)) on OFT ${oftAddress} ` +
              `(unlink ${network} <> ${remoteNetwork}, owner ${owner})`,
            hre,
            populatedTx: await oft.populateTransaction.setPeer(
              remoteEid,
              constants.HashZero,
            ),
            txSignMetadata: {
              mToken,
              action: 'update-lz-oapp-config',
              comment: `deprecation: unlink ${mToken} ${network} <> ${remoteNetwork}`,
            },
            safeMiddlewareWallet: owner,
          });
        }
      }

      // 3. read-only decommission report for the deprecated network
      // (pausing is out of scope here - existing tooling/backoffice covers it)
      const hre = await getHre(deprecatedNetwork);
      const tokenAddresses =
        midasAddressesPerNetwork[deprecatedNetwork]?.[mToken];
      const label = `${mToken} on ${deprecatedNetwork}`;

      if (tokenAddresses?.token) {
        const token = await hre.ethers.getContractAt(
          'mTBILL',
          tokenAddresses.token,
        );
        const paused: boolean = await token.paused();
        decommissionReport.push(
          `${label}: token ${paused ? 'IS paused' : 'is NOT paused'}`,
        );
      }

      for (const vaultType of [
        ...DEPOSIT_VAULT_TYPES,
        ...REDEMPTION_VAULT_TYPES,
      ]) {
        const vaultAddress = tokenAddresses?.[vaultType];
        if (!vaultAddress) continue;

        const vault = await hre.ethers.getContractAt(
          'ManageableVault',
          vaultAddress,
        );

        const fnPrefix = (DEPOSIT_VAULT_TYPES as string[]).includes(vaultType)
          ? 'deposit'
          : 'redeem';

        const relevantFns = Object.entries(VAULT_FUNCTION_SELECTORS).filter(
          ([name]) => name.startsWith(fnPrefix),
        );

        const notPaused: string[] = [];
        for (const [name, selector] of relevantFns) {
          const isPaused: boolean = await vault.fnPaused(selector);
          if (!isPaused) notPaused.push(name);
        }

        decommissionReport.push(
          notPaused.length === 0
            ? `${label}: all ${fnPrefix}* functions of ${vaultType} ARE paused`
            : `${label}: ${vaultType} has UNPAUSED functions: [${notPaused.join(
                ', ',
              )}]`,
        );
      }

      const feedAdminRoleName = getRolesNamesForToken(mToken).customFeedAdmin;
      decommissionReport.push(
        `${label}: ${feedAdminRoleName} holders cannot be enumerated on-chain, ` +
          `verify oracle admin revocation manually (role hash ${
            getRolesForToken(mToken).customFeedAdmin
          })`,
      );
    }
  }

  // ----- report -----

  console.log('\n========== ALREADY DONE ==========');
  okChecks.forEach((v) => console.log(`  [ok] ${v}`));
  if (okChecks.length === 0) console.log('  (nothing)');

  console.log('\n========== WARNINGS ==========');
  warnings.forEach((v) => console.log(`  [!] ${v}`));
  if (warnings.length === 0) console.log('  (none)');

  console.log('\n========== DECOMMISSION STATUS (read-only) ==========');
  decommissionReport.forEach((v) => console.log(`  ${v}`));

  console.log('\n========== REQUIRED TRANSACTIONS ==========');
  const orderedTxs = [...plannedTxs].sort((a, b) => a.order - b.order);
  orderedTxs.forEach((v, i) => console.log(`  ${i + 1}. ${v.description}`));
  if (orderedTxs.length === 0) {
    console.log('  (none - unwiring is fully complete)');
    return;
  }

  if (dryRun) {
    console.log(
      '\nDry run - no transactions submitted. Re-run with DRY_RUN=false to submit',
    );
    return;
  }

  console.log('\n========== SUBMITTING ==========');

  for (const planned of orderedTxs) {
    console.log(`\nSubmitting: ${planned.description}`);

    const txRes = await sendAndWaitForCustomTxSign(
      planned.hre,
      planned.populatedTx,
      planned.txSignMetadata,
      planned.safeMiddlewareWallet,
    );

    console.log('Tx is submitted', txRes);
  }

  console.log(
    `\nAll ${orderedTxs.length} transactions submitted, approve them in Fordefi in the listed order`,
  );
};

export default func;
