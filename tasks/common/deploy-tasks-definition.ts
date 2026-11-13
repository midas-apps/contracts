import path from 'node:path';

import {
  actionParam,
  aggregatorTypeParam,
  feedTargetParam,
  keysParam,
  mTokenParam,
  originalNetworkParam,
  ParseParamFn,
  pTokenParam,
  skipValidationParam,
  upgradeIdParam,
  v2VaultsOnlyParam,
  vaultVersionParam,
} from './task-params';

type DeploymentTask = [string, ...ReturnType<ParseParamFn>[]];

const deploy = (file: string) => path.join('scripts/deploy', `${file}.ts`);
const deployMisc = (file: string) =>
  path.join('scripts/deploy/misc', `${file}.ts`);
const deployPost = (file: string) =>
  path.join('scripts/deploy/post-deploy', `${file}.ts`);
const deployLz = (file: string) =>
  path.join('scripts/deploy/misc/layerzero', `${file}.ts`);
const deployAxelar = (file: string) =>
  path.join('scripts/deploy/misc/axelar', `${file}.ts`);
const deployCodegen = (file: string) =>
  path.join('scripts/deploy/codegen', `${file}.ts`);
const upgrade = (file: string) => path.join('scripts/upgrades', `${file}.ts`);

const deployTasksRecord: Record<string, DeploymentTask> = {
  // Core deploy
  'deploy:ac': [deploy('deploy_AccessControl')],
  'deploy:timelock': [deploy('deploy_TimeLock'), skipValidationParam(true)],
  'deploy:token': [deploy('deploy_Token'), mTokenParam()],
  'deploy:aggregator': [
    deploy('deploy_CustomAggregator'),
    mTokenParam(),
    feedTargetParam(true),
  ],
  'deploy:aggregator:adjusted': [
    deployMisc('deploy_CustomAggregatorAdjusted'),
    mTokenParam(),
  ],
  'deploy:aggregator:adjusted:dv': [
    deployMisc('deploy_CustomAggregatorAdjustedDv'),
    mTokenParam(),
  ],
  'deploy:aggregator:adjusted:rv': [
    deployMisc('deploy_CustomAggregatorAdjustedRv'),
    mTokenParam(),
  ],
  'deploy:aggregator:ptoken': [
    deploy('deploy_PaymentToken_CustomAggregator'),
    pTokenParam(),
  ],
  'deploy:feed': [deploy('deploy_DataFeed'), mTokenParam()],
  'deploy:feed:dv': [deploy('deploy_DataFeedDv'), mTokenParam()],
  'deploy:feed:rv': [deploy('deploy_DataFeedRv'), mTokenParam()],
  'deploy:feed:ptoken': [
    deploy('deploy_PaymentToken_DataFeed'),
    pTokenParam(),
    aggregatorTypeParam(true),
  ],
  'deploy:dv': [deploy('deploy_DV'), mTokenParam(), v2VaultsOnlyParam()],
  'deploy:dv:ustb': [
    deploy('deploy_DVUstb'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:dv:aave': [
    deploy('deploy_DVAave'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:dv:morpho': [
    deploy('deploy_DVMorpho'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:dv:mtoken': [
    deploy('deploy_DVMToken'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:rv': [deploy('deploy_RV'), mTokenParam(), v2VaultsOnlyParam()],
  'deploy:rv:aave': [
    deploy('deploy_RVAave'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:rv:morpho': [
    deploy('deploy_RVMorpho'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:rv:ustb': [
    deploy('deploy_RVUstb'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:rv:mtoken': [
    deploy('deploy_RVMToken'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],

  // Misc
  'deploy:acre:adapter': [
    path.join('scripts/deploy/misc/acre', 'deploy_AcreAdapter.ts'),
    mTokenParam(),
    pTokenParam(),
    v2VaultsOnlyParam(),
  ],

  // Codegen
  'deploy:generate:mproduct': [
    deployCodegen('generate_mproduct'),
    v2VaultsOnlyParam(),
  ],
  'deploy:generate:config': [
    deployCodegen('generate_config'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],

  // Post-deploy
  'deploy:post:add:ptokens': [
    deployPost('add_PaymentTokens'),
    mTokenParam(),
    vaultVersionParam(),
  ],
  'deploy:post:grant:roles': [
    deployPost('grant_AllProductRoles'),
    mTokenParam(),
    vaultVersionParam(),
  ],
  'deploy:post:grant:admin': [deployPost('grant_DefaultAdminRole')],
  'deploy:post:revoke:roles': [deployPost('revoke_DeployerRoles')],
  'deploy:post:transfer:proxyadmin': [
    deployPost('transfer_ProxyAdminToTimelock'),
  ],
  'deploy:post:set:price': [
    deployPost('set_RoundData'),
    mTokenParam(true),
    pTokenParam(true),
    feedTargetParam(true),
  ],
  'deploy:post:set:expected-answers': [
    deployPost('set_ExpectedAnswers'),
    mTokenParam(true),
    pTokenParam(true),
    aggregatorTypeParam(true),
  ],
  'deploy:post:set:waived': [
    deployPost('add_FeeWaived'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:greenlist': [
    deployPost('set_Greenlist'),
    mTokenParam(),
    vaultVersionParam(),
  ],
  'deploy:post:pause:functions': [
    deployPost('pause_Functions'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:add:addressbook': [
    deployPost('add_ToAddressBook'),
    mTokenParam(),
    keysParam(true),
    vaultVersionParam(),
  ],
  'deploy:post:set:sanctionsList': [
    deployPost('set_SanctionsList'),
    mTokenParam(),
    vaultVersionParam(),
  ],
  'deploy:post:set:aaveconfig': [
    deployPost('set_AaveConfig'),
    mTokenParam(),
    vaultVersionParam(),
  ],
  'deploy:post:set:morphoconfig': [
    deployPost('set_MorphoConfig'),
    mTokenParam(),
    vaultVersionParam(),
  ],

  // v2 only
  'deploy:post:set:instantlimits': [
    deployPost('set_InstantLimits'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:mintratelimits': [
    deployPost('set_MintRateLimits'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:tokenconfig': [
    deployPost('set_TokenConfig'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:freefromminamount': [
    deployPost('set_FreeFromMinAmount'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:preferloanliquidity': [
    deployPost('set_PreferLoanLiquidity'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:mtokenconfig': [
    deployPost('set_MTokenConfig'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:ustbconfig': [
    deployPost('set_UstbConfig'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:post:set:userfacingroles': [deployPost('set_UserFacingRoles')],

  // LayerZero
  'deploy:lz:composer': [
    deployLz('deploy_Composer'),
    mTokenParam(),
    pTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:lz:oft': [
    deployLz('deploy_OFT'),
    pTokenParam(),
    originalNetworkParam(),
  ],
  'deploy:lz:oft:adapter': [deployLz('deploy_OFTAdapter'), pTokenParam()],
  'deploy:lz:oft:adapter:mintburn': [
    deployLz('deploy_MintBurnOFTAdapter'),
    mTokenParam(),
    originalNetworkParam(true),
  ],
  'deploy:lz:post:set:ratelimit': [
    deployLz('set_RateLimitConfigs'),
    mTokenParam(),
    originalNetworkParam(true),
  ],
  'deploy:lz:post:transfer:owner': [
    deployLz('transfer_Owner'),
    mTokenParam(true),
    pTokenParam(true),
  ],
  'deploy:lz:post:grant:roles': [deployLz('grant_Roles'), mTokenParam()],
  'deploy:lz:post:revoke:roles': [deployLz('revoke_Roles'), mTokenParam()],
  'deploy:lz:deprecate': [
    deployLz('deprecate_Ofts'),
    mTokenParam(),
    () => ({
      ...actionParam(true)(),
      description:
        'status (default) | disable | finalize | queue-finalize | verify. DRY_RUN=false queues all missing transactions',
    }),
  ],

  // Axelar
  'deploy:axelar:executable': [
    deployAxelar('deploy_Executable'),
    mTokenParam(),
    pTokenParam(),
    v2VaultsOnlyParam(),
  ],
  'deploy:axelar:post:wire': [
    deployAxelar('wire_Tokens'),
    mTokenParam(),
    actionParam(true),
  ],
  'deploy:axelar:post:wire:ptoken': [
    deployAxelar('wire_PaymentTokens'),
    pTokenParam(),
  ],
  'deploy:axelar:post:set:flowlimit': [
    deployAxelar('set_FlowLimit'),
    mTokenParam(),
  ],
  'deploy:axelar:post:grant:roles': [
    deployAxelar('grant_Roles'),
    mTokenParam(),
  ],
  'deploy:axelar:post:revoke:roles': [
    deployAxelar('revoke_Roles'),
    mTokenParam(),
  ],

  // Timelock upgrades
  'timelock:upgrade:contracts': [
    upgrade('upgrade_Contracts'),
    actionParam(),
    upgradeIdParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:vaults:propose': [
    upgrade('proposeUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
    v2VaultsOnlyParam(),
  ],
  'timelock:upgrade:vaults:execute': [
    upgrade('executeUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
    v2VaultsOnlyParam(),
  ],
  'timelock:upgrade:vaults:validate': [
    upgrade('validateUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
    v2VaultsOnlyParam(),
  ],
  'timelock:admin:transfer:propose': [
    upgrade('proposeTransferOwnership_ProxyAdmin'),
    actionParam(),
    skipValidationParam(true),
  ],
  'timelock:admin:transfer:execute': [
    upgrade('executeTransferOwnership_ProxyAdmin'),
    actionParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:reinitializers:verify': [
    upgrade('verifyUpgrade_Reinitializers'),
    mTokenParam(),
    v2VaultsOnlyParam(),
  ],

  // Verify
  'verify:all:impl': [path.join('scripts', 'verify_contracts.ts')],
};

export const deployTasks = Object.entries(deployTasksRecord);
