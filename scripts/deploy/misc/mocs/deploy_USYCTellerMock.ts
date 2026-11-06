import { constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { ERC20Mock__factory } from '../../../../typechain-types';
import { DeployFunction } from '../../common/types';
import { deployAndVerify, getDeployer } from '../../common/utils';

/**
 * Circle's USYC oracles, used by `USYCTellerMock` on testnets
 */
export const usycOracleContracts: Partial<Record<number, string>> = {
  [chainIds.sepolia]: '0x48c9E02E09d03E448673166d29691ECdEf56526F',
};

/**
 * Deploys a USYC mock and a USYC Teller mock owned by the deployer.
 * The Teller asset is the `--ptoken` payment token, the USYC mock gets its decimals.
 * The Teller reads prices from Circle's USYC oracle from `usycOracleContracts`
 * when the network has one, otherwise the prices are set with `setPrices`
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

  const oracle =
    usycOracleContracts[hre.network.config.chainId!] ?? constants.AddressZero;

  await deployAndVerify(
    hre,
    'USYCTellerMock',
    [asset, usyc.address, oracle, deployer.address],
    deployer,
  );
};

export default func;
