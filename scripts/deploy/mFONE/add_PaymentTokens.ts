import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import {
  addPaymentTokens,
  AddPaymentTokensConfig,
} from '../common/common-vault';

const configs: Record<number, AddPaymentTokensConfig> = {
  [chainIds.sepolia]: {
    providerType: 'hardhat',
    vaults: [
      {
        type: 'depositVault',
        paymentTokens: [
          { token: 'usds' },
          { token: 'usdt' },
          { token: 'usdc' },
        ],
      },
      {
        type: 'redemptionVaultSwapper',
        paymentTokens: [{ token: 'usdc' }],
      },
    ],
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await addPaymentTokens(hre, 'mFONE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
