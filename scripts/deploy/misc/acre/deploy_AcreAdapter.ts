import { group, select, spinner } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getCurrentAddresses,
  VaultType,
} from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getMTokenOrThrow,
  getPaymentTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  AcreAdapter__factory,
} from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const pToken = getPaymentTokenOrThrow(hre);
  const deployer = await getDeployer(hre);

  const addresses = getCurrentAddresses(hre);

  if (!addresses?.paymentTokens) {
    throw new Error('Data feeds not found');
  }

  const pTokenAddresses = addresses.paymentTokens[pToken];
  const mTokenAddresses = addresses[mToken];

  if (!pTokenAddresses?.token) {
    throw new Error('Payment token addresses not found');
  }

  if (!mTokenAddresses) {
    throw new Error('mToken addresses not found');
  }

  const { dv, rv } = await group({
    dv: () =>
      select<VaultType>({
        message: 'Select deposit vault to use',
        options: [
          {
            value: 'depositVault',
          },
          {
            value: 'depositVaultUstb',
          },
        ],
        initialValue: 'depositVault',
      }),
    rv: () =>
      select<VaultType>({
        message: 'Select redemption vault to use',
        options: [
          {
            value: 'redemptionVault',
          },
          {
            value: 'redemptionVaultSwapper',
          },
          {
            value: 'redemptionVaultBuidl',
          },
        ],
        initialValue: 'redemptionVaultSwapper',
      }),
  });

  const dvAddress = mTokenAddresses[dv];
  const rvAddress = mTokenAddresses[rv];

  if (!dvAddress || !rvAddress) {
    throw new Error('Vault addresses not found');
  }

  const args = [dvAddress, rvAddress, pTokenAddresses.token] as const;
  const deployment = await new AcreAdapter__factory(deployer).deploy(...args);

  logDeploy('AcreAdapter', undefined, deployment.address);

  console.log('Waiting for deployment to be confirmed...');
  await deployment.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, deployment.address, ...args);
};

export default func;
