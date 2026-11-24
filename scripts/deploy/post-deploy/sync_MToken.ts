import { HardhatRuntimeEnvironment } from 'hardhat/types';

import pauseContracts from './pause_Contracts';
import pauseFunctions from './pause_Functions';
import setGreenlist from './set_Greenlist';

import { MTokenName } from '../../../config';
import {
  addPaymentTokens,
  setAaveConfig,
  setFeeWaivedAccounts,
  setMorphoConfig,
} from '../common/common-vault';
import {
  updateExpectedAnswersMToken,
  updateFeedSettingsMToken,
} from '../common/data-feed';
import { grantAllProductRoles } from '../common/roles';
import { runSync } from '../common/sync';
import {
  DeployFunction,
  DeploymentConfig,
  PostDeployConfig,
} from '../common/types';
import {
  setFreeFromMinAmount,
  setInstantLimits,
  setMintRateLimits,
  setMTokenVaultConfig,
  setPreferLoanLiquidity,
  setTokenConfig,
  setUstbVaultConfig,
  setVaultSettings,
} from '../common/v2-post-deploy';
import { getDeploymentConfigForToken } from '../configs';

type ProductConfig = {
  generic: DeploymentConfig['genericConfigs'];
  network: DeploymentConfig['networkConfigs'][number];
};

type MTokenSyncStep = {
  name: string;
  /** the step is skipped when it returns false. Default: always runs */
  isConfigured?: (config: ProductConfig) => boolean;
  /** an existing post-deploy step: reads on-chain state, sends the diff */
  run: (hre: HardhatRuntimeEnvironment, mToken: MTokenName) => Promise<unknown>;
};

/** step of a `postDeploy` config section */
const postDeployStep = (
  key: keyof PostDeployConfig,
  run: MTokenSyncStep['run'],
): MTokenSyncStep => ({
  name: key,
  isConfigured: ({ network }) => network.postDeploy?.[key] !== undefined,
  run,
});

/**
 * Steps in the order they are sent. Pauses go last.
 * Not synced: `setRoundData` (pushes a price), sanctions list script (not
 * config driven, see `enableSanctionsList` in vault settings), LayerZero and
 * Axelar
 */
const syncSteps: MTokenSyncStep[] = [
  postDeployStep('grantRoles', grantAllProductRoles),
  { name: 'vaultSettings', run: setVaultSettings },
  postDeployStep('addPaymentTokens', addPaymentTokens),
  postDeployStep('addFeeWaived', setFeeWaivedAccounts),
  postDeployStep('greenlist', setGreenlist),
  postDeployStep('instantLimits', setInstantLimits),
  postDeployStep('mintRateLimits', setMintRateLimits),
  postDeployStep('tokenConfig', setTokenConfig),
  postDeployStep('freeFromMinAmount', setFreeFromMinAmount),
  postDeployStep('preferLoanLiquidity', setPreferLoanLiquidity),
  postDeployStep('setMTokenConfig', setMTokenVaultConfig),
  postDeployStep('setUstbConfig', setUstbVaultConfig),
  postDeployStep('setAaveConfig', setAaveConfig),
  postDeployStep('setMorphoConfig', setMorphoConfig),
  { name: 'feedSettings', run: updateFeedSettingsMToken },
  {
    name: 'expectedAnswers',
    isConfigured: ({ generic }) =>
      [generic.dataFeed, generic.dataFeedDv, generic.dataFeedRv].some(
        (c) => c?.minAnswer !== undefined && c?.maxAnswer !== undefined,
      ),
    run: updateExpectedAnswersMToken,
  },
  postDeployStep('pauseFunctions', pauseFunctions),
  postDeployStep('pauseContracts', pauseContracts),
];

/** Syncs the mToken config of the network with on-chain state, see `runSync` */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  dryRun?: boolean,
) => {
  const config = getDeploymentConfigForToken(mToken, hre.deploymentConfig);
  const network = config?.networkConfigs?.[hre.network.config.chainId!];

  if (!config || !network) {
    throw new Error(`${mToken} config is not found for ${hre.network.name}`);
  }

  const productConfig = { generic: config.genericConfigs, network };

  await runSync(
    hre,
    mToken,
    syncSteps.map((step) => ({
      name: step.name,
      isConfigured: step.isConfigured?.(productConfig) ?? true,
      run: () => step.run(hre, mToken),
    })),
    dryRun,
  );
};

export default func;
