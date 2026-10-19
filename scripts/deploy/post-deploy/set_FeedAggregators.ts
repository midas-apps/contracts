import { PopulatedTransaction } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  CustomAggregatorV3CompatibleFeedAdjusted,
  DataFeed,
  DepositVault,
  RedemptionVault,
} from '../../../typechain-types';
import { DeployFunction } from '../common/types';
import {
  getDeploymentGenericConfig,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from '../common/utils';

const sides = [
  {
    side: 'dv',
    dataFeedKey: 'dataFeedDv',
    aggregatorKey: 'customFeedDv',
    configKey: 'customAggregatorAdjustedDv',
    vaultPrefix: 'depositVault',
  },
  {
    side: 'rv',
    dataFeedKey: 'dataFeedRv',
    aggregatorKey: 'customFeedRv',
    configKey: 'customAggregatorAdjustedRv',
    vaultPrefix: 'redemptionVault',
  },
] as const;

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Points dataFeedDv/dataFeedRv at the customFeedDv/customFeedRv from addresses.ts
 * via DataFeed.changeAggregator. Vaults cannot swap their data feed, so this is how
 * an adjusted (holdback) feed gets replaced.
 * Dry run by default: validates the new feeds and simulates the calls.
 * DRY_RUN=false creates the Fordefi requests. Re-running is safe: switched feeds are
 * skipped and the signer does not duplicate requests still awaiting approval.
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  if (
    process.env.DRY_RUN !== undefined &&
    !['true', 'false'].includes(process.env.DRY_RUN)
  )
    throw new Error('DRY_RUN must be true or false');
  const submit = process.env.DRY_RUN === 'false';

  const addresses = getCurrentAddresses(hre)?.[mToken];
  if (!addresses) throw new Error(`${mToken} addresses not found`);

  const provider = hre.ethers.provider;
  const { timestamp } = await provider.getBlock('latest');
  const caller = await getWalletAddressForAction(
    hre,
    'update-feed-mtoken',
    mToken,
    hre.network.config.chainId,
  );
  console.log(`${mToken} on ${hre.network.name}, caller ${caller}`);

  const errors: string[] = [];
  const txs: { tx: PopulatedTransaction; comment: string }[] = [];

  for (const {
    side,
    dataFeedKey,
    aggregatorKey,
    configKey,
    vaultPrefix,
  } of sides) {
    const dataFeedAddress = addresses[dataFeedKey];
    const newAggregator = addresses[aggregatorKey];
    if (!dataFeedAddress || !newAggregator)
      throw new Error(`${dataFeedKey} or ${aggregatorKey} is not set`);

    const dataFeed = (
      await hre.ethers.getContractAt('DataFeed', dataFeedAddress)
    ).connect(provider) as DataFeed;
    const currentAggregator = await dataFeed.aggregator();
    console.log(
      `\n[${side}] ${dataFeedKey} ${dataFeedAddress}: aggregator ${currentAggregator}, rate ${formatUnits(
        await dataFeed.getDataInBase18(),
      )}`,
    );

    if (eq(currentAggregator, newAggregator)) {
      console.log(`[${side}] already points to ${aggregatorKey}, skipping`);
      continue;
    }

    const fail = (msg: string) => errors.push(`[${side}] ${msg}`);
    const config = getDeploymentGenericConfig(hre, mToken, configKey);
    const expectedUnderlying =
      config.underlyingFeed === 'customFeed' ||
      config.underlyingFeed === 'customFeedGrowth'
        ? addresses[config.underlyingFeed]
        : config.underlyingFeed;

    if ((await provider.getCode(newAggregator)) === '0x') {
      fail(`${aggregatorKey} ${newAggregator} has no code`);
      continue;
    }
    const feed = (
      await hre.ethers.getContractAt(
        'CustomAggregatorV3CompatibleFeedAdjusted',
        newAggregator,
      )
    ).connect(provider) as CustomAggregatorV3CompatibleFeedAdjusted;
    const current = (
      await hre.ethers.getContractAt(
        'CustomAggregatorV3CompatibleFeedAdjusted',
        currentAggregator,
      )
    ).connect(provider) as CustomAggregatorV3CompatibleFeedAdjusted;

    const underlying = await feed.underlyingFeed();
    const percentage = await feed.adjustmentPercentage();
    const decimals = await feed.decimals();
    const { answer, updatedAt } = await feed.latestRoundData();
    const { answer: currentAnswer } = await current.latestRoundData();
    const min = await dataFeed.minExpectedAnswer();
    const max = await dataFeed.maxExpectedAnswer();
    const healthyDiff = await dataFeed.healthyDiff();
    const fmt = (v: typeof answer) => formatUnits(v, decimals);

    if (!expectedUnderlying || !eq(underlying, expectedUnderlying))
      fail(`underlyingFeed ${underlying} != ${expectedUnderlying}`);
    if (!percentage.eq(config.adjustmentPercentage))
      fail(
        `adjustmentPercentage ${formatUnits(
          percentage,
          8,
        )}% != config ${formatUnits(config.adjustmentPercentage, 8)}%`,
      );
    if (decimals !== (await current.decimals()))
      fail(`decimals ${decimals} differ from the current aggregator`);
    if (answer.lt(min) || answer.gt(max))
      fail(`answer ${fmt(answer)} outside [${fmt(min)}, ${fmt(max)}]`);
    if (healthyDiff.lt(timestamp - updatedAt.toNumber()))
      fail(`answer is stale (updatedAt ${updatedAt})`);

    const tx = await dataFeed.populateTransaction.changeAggregator(
      newAggregator,
    );
    // callStatic, not provider.call: ethers v5 provider.call returns revert data instead of throwing
    try {
      await dataFeed.callStatic.changeAggregator(newAggregator, {
        from: caller,
      });
    } catch (e) {
      fail(
        `changeAggregator simulation from ${caller} reverted: ${
          (e as { reason?: string }).reason ?? e
        }`,
      );
    }

    // ponytail: linear scan of all requests, fine for small vaults; use the indexer for big ones
    for (const [key, vaultAddress] of Object.entries(addresses)) {
      if (!key.startsWith(vaultPrefix) || typeof vaultAddress !== 'string')
        continue;
      const vault = (
        await hre.ethers.getContractAt(
          side === 'dv' ? 'DepositVault' : 'RedemptionVault',
          vaultAddress,
        )
      ).connect(provider) as DepositVault & RedemptionVault;
      if (!eq(await vault.mTokenDataFeed(), dataFeedAddress)) continue;

      const pending: number[] = [];
      const count = (await vault.currentRequestId()).toNumber();
      for (let id = 0; id < count; id++) {
        const { status } =
          side === 'dv'
            ? await vault.mintRequests(id)
            : await vault.redeemRequests(id);
        if (status === 0) pending.push(id);
      }
      console.log(
        `[${side}] ${key} ${vaultAddress} reads this feed, pending requests: [${pending.join(
          ', ',
        )}]`,
      );
      if (pending.length)
        console.warn(
          `[${side}] WARNING: pending requests keep their saved rate; decide how to settle them before approving the switch`,
        );
    }

    const comment = `${mToken} ${dataFeedKey} changeAggregator ${currentAggregator} -> ${newAggregator} (${fmt(
      currentAnswer,
    )} -> ${fmt(answer)})`;
    console.log(`[${side}] ${comment}`);
    console.log(`[${side}] to ${tx.to}, data ${tx.data}`);
    txs.push({ tx, comment });
  }

  if (errors.length)
    throw new Error(`Validation failed, nothing sent:\n${errors.join('\n')}`);
  if (!txs.length) {
    console.log('\nAll data feeds already switched');
    return;
  }
  if (!submit) {
    console.log(
      '\nDry run passed: no transactions sent. Add DRY_RUN=false to create the Fordefi requests.',
    );
    return;
  }

  for (const { tx, comment } of txs) {
    const res = await sendAndWaitForCustomTxSign(hre, tx, {
      action: 'update-feed-mtoken',
      mToken,
      comment,
    });
    console.log(comment, res);
  }
};

export default func;
