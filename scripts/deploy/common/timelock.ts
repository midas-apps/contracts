import { constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerify, getDeployer } from './utils';

import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { logDeploy } from '../../../helpers/utils';
import { networkDeploymentConfigs } from '../configs/network-configs';

export type DeployTimelockConfig = {
  minDelay: number;
  proposer: string;
  executor?: string;
};

export const deployTimelock = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  const networkConfig = networkDeploymentConfigs[hre.network.config.chainId!];

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const { timelock } = networkConfig;

  if (!timelock) {
    throw new Error('Timelock config is not found');
  }

  const timelockContractName = getCommonContractNames().timelock;

  const timelockContract = await deployAndVerify(
    hre,
    timelockContractName,
    [
      timelock.minDelay,
      [timelock.proposer],
      [timelock.executor ?? timelock.proposer],
      constants.AddressZero,
    ],
    deployer,
  );

  logDeploy(timelockContractName, undefined, timelockContract.address);
};

type GetUpgradeTxParams = {
  proxyAddress: string;
  newImplementation: string;
  callData?: string;
};

const getUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  { newImplementation, proxyAddress, callData }: GetUpgradeTxParams,
) => {
  const admin = await hre.upgrades.admin.getInstance();

  const upgradeCallData = callData
    ? admin.interface.encodeFunctionData('upgradeAndCall', [
        proxyAddress,
        newImplementation,
        callData,
      ])
    : admin.interface.encodeFunctionData('upgrade', [
        proxyAddress,
        newImplementation,
      ]);

  return upgradeCallData;
};

export const proposeUpgradeTx = async (
  hre: HardhatRuntimeEnvironment,
  upgradeParams: GetUpgradeTxParams[],
) => {
  const admin = await hre.upgrades.admin.getInstance();

  const networkAddresses = getCurrentAddresses(hre);
  const upgradeTxCallDatas = await Promise.all(
    upgradeParams.map((params) => getUpgradeTx(hre, params)),
  );

  const timelockContract = await hre.ethers.getContractAt(
    'TimelockController',
    networkAddresses!.timelock!,
  );

  const tx = await timelockContract.populateTransaction.scheduleBatch(
    upgradeTxCallDatas.map((_) => admin.address),
    upgradeTxCallDatas.map((_) => 0),
    upgradeTxCallDatas,
    [0],
    [0],
    await timelockContract.getMinDelay(),
  );

  return tx;
};
