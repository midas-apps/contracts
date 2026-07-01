// Usage: set AGGREGATOR_PROXY below, then:
//   yarn hardhat runscript scripts/deploy/misc/mglobal-infini/setRoundData_MGlobalInfiniFiGrowthOracle.ts --network main

import { constants } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { CustomAggregatorV3CompatibleFeedGrowth } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const INITIAL_DATA = parseUnits('1', 8);
const INITIAL_APR = parseUnits('0', 8);

const AGGREGATOR_PROXY: `0x${string}` =
  '0xFc05B888B19f1cCf8aa87ad8fc28A9d5643E65f8';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (AGGREGATOR_PROXY === constants.AddressZero) {
    throw new Error('Set AGGREGATOR_PROXY to the deployed proxy address.');
  }

  const provider = await getDeployer(hre);
  const aggregator = (
    await hre.ethers.getContractAt(
      'CustomAggregatorV3CompatibleFeedGrowth',
      AGGREGATOR_PROXY,
    )
  ).connect(provider) as CustomAggregatorV3CompatibleFeedGrowth;

  const dataTimestamp =
    (await hre.ethers.provider.getBlock('latest')).timestamp - 1;

  const tx = await aggregator.populateTransaction.setRoundData(
    INITIAL_DATA,
    dataTimestamp,
    INITIAL_APR,
  );

  const log = `mGLOBAL infiniFi set price to ${formatUnits(
    INITIAL_DATA,
    8,
  )}/${formatUnits(INITIAL_APR, 8)}% at ${dataTimestamp}`;

  const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
    action: 'update-feed-mtoken',
    subAction: 'set-round-data',
    mToken: 'mGLOBAL',
    comment: log,
  });

  console.log(log, txRes);
};

export default func;
