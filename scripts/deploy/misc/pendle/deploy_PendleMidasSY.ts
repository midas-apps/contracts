import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getMTokenOrThrow,
  getPaymentTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';

const pendleProxyAdmin = '0xA28c08f165116587D4F3E708743B4dEe155c5E64';
const pendleAdmin = '0x2aD631F72fB16d91c4953A7f4260A97C2fE2f31e';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const pToken = getPaymentTokenOrThrow(hre);
  const syFactory = await hre.ethers.getContractFactory('PendleMidasSY');

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];
  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  const pTokenAddresses = addresses?.paymentTokens?.[pToken];
  if (!pTokenAddresses) {
    throw new Error('PToken addresses not found');
  }

  const constructorArgs = [
    tokenAddresses.token!,
    tokenAddresses.depositVault!,
    tokenAddresses.redemptionVaultSwapper ??
      tokenAddresses.redemptionVaultUstb ??
      tokenAddresses.redemptionVault!,
    tokenAddresses.dataFeed!,
    pTokenAddresses.token!,
  ] as const;
  const impl = await syFactory.deploy(...constructorArgs);

  logDeploy('PendleMidasSY', 'Impl', impl.address);

  await impl.deployTransaction.wait(2);

  const proxyArgs = [
    impl.address,
    pendleProxyAdmin,
    syFactory.interface.encodeFunctionData('initialize', [
      `SY Midas ${mToken}`,
      `SY-${mToken}`,
    ]),
  ] as const;
  const proxy = await (
    await hre.ethers.getContractFactory('TransparentUpgradeableProxy')
  ).deploy(...proxyArgs);
  logDeploy('PendleMidasSY', 'Proxy', proxy.address);

  await proxy.deployTransaction.wait(2);

  await etherscanVerify(hre, impl.address, ...constructorArgs).catch((e) => {
    console.error('Unable to verify implementation. Error: ', e);
  });

  await etherscanVerify(hre, proxy.address, ...proxyArgs).catch((e) => {
    console.error('Unable to verify proxy. Error: ', e);
  });

  const contract = syFactory.attach(proxy.address);

  const tx = await contract.transferOwnership(pendleAdmin, true, false);

  logDeploy('PendleMidasSY', 'TransferOwnership tx', tx.hash);
  await tx.wait(2);
  console.log('Done');
};

export default func;
