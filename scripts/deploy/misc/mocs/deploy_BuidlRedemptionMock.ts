import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { etherscanVerify } from '../../../../helpers/utils';
import { RedemptionTest__factory } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);

  const addresses = getCurrentAddresses(hre);

  console.log('Deploying BuidlRedemptionMock...');

  const deployment = await new RedemptionTest__factory(deployer).deploy(
    '0xE6e05cf306d41585BEE8Ae48F9f2DD7E0955e6D3', // test BUIDL token on sepolia
    addresses!.paymentTokens!.usdc!.token!,
  );

  console.log('Deployed BuidlRedemptionMock :', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await etherscanVerify(hre, deployment.address);
};

export default func;
