import {
  impersonateAccount,
  mine,
} from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';

import { rpcUrls } from '../../../config';
import { MToken } from '../../../typechain-types';

async function impersonateAndFundAccount(
  address: string,
): Promise<SignerWithAddress> {
  await impersonateAccount(address);
  await network.provider.send('hardhat_setBalance', [
    address,
    ethers.utils.hexStripZeros(parseUnits('1000', 18).toHexString()),
  ]);
  return ethers.getSigner(address);
}

export async function hyperEvmUpgradeFixture() {
  const dvProxyAddress = '0x48fb106Ef0c0C1a19EdDC9C5d27A945E66DA1C4E';
  const rvSwapperProxyAddress = '0xD26bB9B45140D17eF14FbD4fCa8Cf0d610ac50E7';

  const newDvImplementationAddress =
    '0x448897fEc88D145E22cA8594F1a928C72e1De8a6';
  const newRvSwapperImplementationAddress =
    '0x67581417D7AFe1E02d1Da4AbfD4fa6a2774e625f';

  const tokenManagerAddress = '0x46a12DDCA8c92742251b2a2c33610BF8Ae090cd9';
  const vaultsManagerAddress = '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12';
  const proxyAdminAddress = '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC';

  const [customRecipient] = await ethers.getSigners();
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: rpcUrls.hyperevm,
          blockNumber: 9874404,
        },
      },
    ],
  });

  await network.provider.send('evm_setAutomine', [true]);

  await mine();

  const proxyAdmin = await ethers.getContractAt(
    'ProxyAdmin',
    proxyAdminAddress,
  );
  const proxyAdminOwnerAddress = await proxyAdmin.owner();

  const proxyAdminOwner = await impersonateAndFundAccount(
    proxyAdminOwnerAddress,
  );

  const xaut0 = await ethers.getContractAt(
    'ERC20',
    '0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949',
  );

  const xaut0Whale = await impersonateAndFundAccount(
    '0xaF7FD67AE6B3E25F83291D5600fBe3B776EEa4d3',
  );

  const vaultsManager = await impersonateAndFundAccount(vaultsManagerAddress);

  const tokenManager = await impersonateAndFundAccount(tokenManagerAddress);

  await proxyAdmin
    .connect(proxyAdminOwner)
    .upgrade(dvProxyAddress, newDvImplementationAddress);

  await proxyAdmin
    .connect(proxyAdminOwner)
    .upgrade(rvSwapperProxyAddress, newRvSwapperImplementationAddress);

  const depositVault = await ethers.getContractAt(
    'HBXautDepositVault',
    dvProxyAddress,
  );

  const redemptionVaultSwapper = await ethers.getContractAt(
    'HBXautRedemptionVaultWithSwapper',
    rvSwapperProxyAddress,
  );

  const xbxautDataFeed = await ethers.getContractAt(
    'HBXautDataFeed',
    await depositVault.mTokenDataFeed(),
  );

  const xbxaut = (await ethers.getContractAt(
    'hbXAUt',
    await depositVault.mToken(),
  )) as MToken;

  const xaut0DataFeed = await ethers.getContractAt(
    'DataFeed',
    (await depositVault.tokensConfig(xaut0.address)).dataFeed,
  );

  await xaut0
    .connect(xaut0Whale)
    .transfer(redemptionVaultSwapper.address, parseUnits('10', 6));

  const requestRedeemerAddress = await redemptionVaultSwapper.requestRedeemer();

  const requestRedeemer = await impersonateAndFundAccount(
    requestRedeemerAddress,
  );

  await xaut0
    .connect(requestRedeemer)
    .approve(redemptionVaultSwapper.address, parseUnits('1000', 6));

  await xaut0
    .connect(xaut0Whale)
    .transfer(requestRedeemerAddress, parseUnits('10', 6));

  return {
    proxyAdmin,
    proxyAdminOwner,
    dvProxyAddress,
    rvSwapperProxyAddress,
    newDvImplementationAddress,
    newRvSwapperImplementationAddress,
    xaut0Whale,
    xaut0,
    vaultsManager,
    redemptionVaultSwapper,
    depositVault,
    xbxautDataFeed,
    xaut0DataFeed,
    xbxaut,
    tokenManager,
    customRecipient,
  };
}

export type DeployedContracts = Awaited<
  ReturnType<typeof hyperEvmUpgradeFixture>
>;
