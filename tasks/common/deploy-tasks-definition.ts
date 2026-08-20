import path from 'node:path';

import {
  actionParam,
  aggregatorTypeParam,
  keysParam,
  mTokenParam,
  originalNetworkParam,
  ParseParamFn,
  pTokenParam,
  skipValidationParam,
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
  'deploy:aggregator': [deploy('deploy_CustomAggregator'), mTokenParam()],
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
  'deploy:dv': [deploy('deploy_DV'), mTokenParam()],
  'deploy:dv:ustb': [deploy('deploy_DVUstb'), mTokenParam()],
  'deploy:dv:aave': [deploy('deploy_DVAave'), mTokenParam()],
  'deploy:dv:morpho': [deploy('deploy_DVMorpho'), mTokenParam()],
  'deploy:dv:mtoken': [deploy('deploy_DVMToken'), mTokenParam()],
  'deploy:rv': [deploy('deploy_RV'), mTokenParam()],
  'deploy:rv:swapper': [deploy('deploy_RVSwapper'), mTokenParam()],
  'deploy:rv:aave': [deploy('deploy_RVAave'), mTokenParam()],
  'deploy:rv:morpho': [deploy('deploy_RVMorpho'), mTokenParam()],
  'deploy:rv:mtoken': [deploy('deploy_RVMToken'), mTokenParam()],

  // Misc
  'deploy:acre:adapter': [
    path.join('scripts/deploy/misc/acre', 'deploy_AcreAdapter.ts'),
    mTokenParam(),
    pTokenParam(),
  ],

  // Codegen
  'deploy:generate:contracts': [deployCodegen('generate_contracts')],
  'deploy:generate:config': [deployCodegen('generate_config'), mTokenParam()],

  // Post-deploy
  'deploy:post:add:ptokens': [deployPost('add_PaymentTokens'), mTokenParam()],
  'deploy:post:grant:roles': [
    deployPost('grant_AllProductRoles'),
    mTokenParam(),
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
  ],
  'deploy:post:set:expected-answers': [
    deployPost('set_ExpectedAnswers'),
    mTokenParam(true),
    pTokenParam(true),
  ],
  'deploy:post:set:waived': [deployPost('add_FeeWaived'), mTokenParam()],
  'deploy:post:set:greenlist': [deployPost('set_Greenlist'), mTokenParam()],
  'deploy:post:pause:functions': [deployPost('pause_Functions'), mTokenParam()],
  'deploy:post:add:addressbook': [
    deployPost('add_ToAddressBook'),
    mTokenParam(),
    keysParam(true),
  ],
  'deploy:post:set:sanctionsList': [
    deployPost('set_SanctionsList'),
    mTokenParam(),
  ],
  'deploy:post:set:aaveconfig': [deployPost('set_AaveConfig'), mTokenParam()],
  'deploy:post:set:morphoconfig': [
    deployPost('set_MorphoConfig'),
    mTokenParam(),
  ],

  // LayerZero
  'deploy:lz:composer': [
    deployLz('deploy_Composer'),
    mTokenParam(),
    pTokenParam(),
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
  'deploy:lz:deprecate': [deployLz('deprecate_Ofts')],

  // Axelar
  'deploy:axelar:executable': [
    deployAxelar('deploy_Executable'),
    mTokenParam(),
    pTokenParam(),
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
  'timelock:upgrade:vaults:propose': [
    upgrade('proposeUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:vaults:execute': [
    upgrade('executeUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:vaults:validate': [
    upgrade('validateUpgrade_Vaults'),
    actionParam(),
    skipValidationParam(true),
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
  'timelock:upgrade:token:propose': [
    upgrade('proposeUpgrade_Token'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:token:execute': [
    upgrade('executeUpgrade_Token'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregators:propose': [
    upgrade('proposeUpgrade_Aggregators'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregators:execute': [
    upgrade('executeUpgrade_Aggregators'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregator-deviation:propose': [
    upgrade('proposeUpgrade_AggregatorDeviation'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregator-deviation:execute': [
    upgrade('executeUpgrade_AggregatorDeviation'),
    mTokenParam(),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregator-timelapsed:propose': [
    upgrade('proposeUpgrade_AggregatorTimelapsed'),
    mTokenParam(true),
    actionParam(true),
    skipValidationParam(true),
  ],
  'timelock:upgrade:aggregator-timelapsed:execute': [
    upgrade('executeUpgrade_AggregatorTimelapsed'),
    mTokenParam(true),
    actionParam(true),
    skipValidationParam(true),
  ],
  'timelock:upgrade:reinitializers:verify': [
    upgrade('verifyUpgrade_Reinitializers'),
    mTokenParam(),
  ],
  'upgrade:rv:mtoken': [
    upgrade('upgrade_RedemptionVaultMToken'),
    mTokenParam(),
  ],

  // Verify
  'verify:all:impl': [path.join('scripts', 'verify_contracts.ts')],
};

export const deployTasks = Object.entries(deployTasksRecord);
