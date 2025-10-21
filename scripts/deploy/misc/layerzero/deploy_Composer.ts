import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getCommonContractNames } from '../../../../helpers/contracts';
import {
  etherscanVerify,
  getMTokenOrThrow,
  getPaymentTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const pToken = getPaymentTokenOrThrow(hre);
  const addresses = getCurrentAddresses(hre);

  const contractNamesCommon = getCommonContractNames();

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses) {
    throw new Error('mToken addresses not found');
  }

  if (!mTokenAddresses.layerZero?.oftAdapter) {
    throw new Error('mToken layerzero adapter not found');
  }

  const pTokenOft = addresses?.paymentTokens?.[pToken]?.layerZero?.oft;

  if (!pTokenOft) {
    throw new Error('pToken OFT not found');
  }

  const deployer = await getDeployer(hre);

  const factory = await hre.ethers.getContractFactory(
    'MidasVaultComposerSync',
    deployer,
  );

  const args = [
    mTokenAddresses.depositVault!,
    mTokenAddresses.redemptionVaultSwapper ??
      mTokenAddresses.redemptionVaultUstb ??
      mTokenAddresses.redemptionVault ??
      mTokenAddresses.redemptionVaultBuidl!,
    pTokenOft,
    mTokenAddresses.layerZero.oftAdapter,
  ] as const;

  const contract = await factory.deploy(...args);

  logDeploy(
    contractNamesCommon.layerZero.vaultComposer,
    undefined,
    contract.address,
  );

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
