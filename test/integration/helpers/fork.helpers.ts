import { impersonateAccount } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';

export async function resetFork(rpcUrl: string, blockNumber: number) {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [{ forking: { jsonRpcUrl: rpcUrl, blockNumber } }],
  });
  await network.provider.send('evm_setAutomine', [true]);
}

export async function impersonateAndFundAccount(
  address: string,
): Promise<SignerWithAddress> {
  await impersonateAccount(address);
  await network.provider.send('hardhat_setBalance', [
    address,
    ethers.utils.hexStripZeros(parseUnits('1000', 18).toHexString()),
  ]);
  return ethers.getSigner(address);
}
