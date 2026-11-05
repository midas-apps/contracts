import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { ERC20Mock__factory } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { deployAndVerify, getDeployer } from '../../common/utils';

/**
 * Deploys a USYC mock and a USYC Teller mock owned by the deployer.
 * The Teller asset is the `--ptoken` payment token, the USYC mock gets its decimals
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const paymentToken = hre.paymentToken;
  if (!paymentToken) {
    throw new Error('PaymentToken parameter not found');
  }

  const asset = getCurrentAddresses(hre)?.paymentTokens?.[paymentToken]?.token;
  if (!asset) {
    throw new Error(`${paymentToken} address is not found`);
  }

  const deployer = await getDeployer(hre);

  const decimals = await ERC20Mock__factory.connect(asset, deployer).decimals();

  const usyc = await deployAndVerify(
    hre,
    'ERC20MockWithName',
    [decimals, 'USYC', 'USYC'],
    deployer,
  );

  await deployAndVerify(
    hre,
    'USYCTellerMock',
    [asset, usyc.address, deployer.address],
    deployer,
  );
};

export default func;
