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
  [chainIds.base]: {
    providerType: 'fordefi',
    vaults: [
      {
        type: 'depositVault',
        paymentTokens: [{ token: 'usdt' }],
      },
      {
        type: 'redemptionVault',
        paymentTokens: [{ token: 'usdt' }],
      },
    ],
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];
  await addPaymentTokens(hre, 'hbUSDT', networkConfig);
};

func(hre).then(console.log).catch(console.error);
