import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContracts,
  proposeUpgradeContracts,
} from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { getRolesForToken } from '../../helpers/roles';
import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';
import { getDeployer } from '../deploy/common/utils';

const clawbackRecipients = {} as Record<MTokenName, string>;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-custom-aggregator-upgrade';

  const networkAddresses = getCurrentAddresses(hre);
  const mTokens = ['mTBILL', 'mSL'] as MTokenName[];

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose' ? proposeUpgradeContracts : executeUpgradeContracts;

  const deployer = await getDeployer(hre);

  await fn(
    hre,
    upgradeId,
    'token',
    mTokens.map((mToken) => {
      const clawbackRecipient = clawbackRecipients[mToken] ?? deployer.address;
      const roles = getRolesForToken(mToken);

      return {
        mToken,
        addresses: networkAddresses?.[mToken] ?? {},
        contracts: [
          {
            contractType: 'token',
            initializer: 'initializeV2',
            initializerArgs: [clawbackRecipient],
            constructorArgs: [roles.tokenManager, roles.minter, roles.burner],
          },
        ],
      };
    }),
  );
};

export default func;
