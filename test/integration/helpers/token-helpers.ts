import { impersonateAccount } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';

import { MAINNET_ADDRESSES } from './mainnet-whale-addresses';

import { IERC20 } from '../../../typechain-types';

export async function transferFromWhaleWithPermissions(
  token: IERC20,
  whaleAddressOrSigner: string | SignerWithAddress,
  recipient: string,
  amount: BigNumber,
): Promise<void> {
  let whale: SignerWithAddress;
  let whaleAddress: string;

  if (typeof whaleAddressOrSigner === 'string') {
    whaleAddress = whaleAddressOrSigner;
    await impersonateAccount(whaleAddress);
    await network.provider.send('hardhat_setBalance', [
      whaleAddress,
      ethers.utils.hexStripZeros(parseUnits('1000', 18).toHexString()),
    ]);
    whale = await ethers.getSigner(whaleAddress);
  } else {
    whale = whaleAddressOrSigner;
    whaleAddress = whale.address;
  }

  // Check if this is USTB
  if (
    token.address.toLowerCase() ===
    MAINNET_ADDRESSES.SUPERSTATE_TOKEN_PROXY.toLowerCase()
  ) {
    await setupUSTBAllowlist(token, whaleAddress, recipient);
  }

  // Perform transfer
  const tx = await token.connect(whale).transfer(recipient, amount);
  await tx.wait();
}

async function setupUSTBAllowlist(
  token: IERC20,
  whaleAddress: string,
  recipient: string,
): Promise<void> {
  const ustb = await ethers.getContractAt('ISuperstateToken', token.address);
  const allowListV2Addr = await ustb.allowListV2();
  const fundSymbol = await ustb.symbol();

  const allowListV2 = await ethers.getContractAt(
    'IAllowListV2',
    allowListV2Addr,
  );
  const allowListOwnerAddr = await allowListV2.owner();

  await impersonateAccount(allowListOwnerAddr);
  await network.provider.send('hardhat_setBalance', [
    allowListOwnerAddr,
    ethers.utils.hexStripZeros(parseUnits('10', 18).toHexString()),
  ]);
  const allowListOwner = await ethers.getSigner(allowListOwnerAddr);

  const entityId = 1;

  for (const addr of [whaleAddress, recipient]) {
    // Clear protocol permissions if needed
    const hasProtocolPerms = await allowListV2.hasAnyProtocolPermissions(addr);
    if (hasProtocolPerms) {
      const hasUstbPerm = await allowListV2.protocolPermissions(
        addr,
        fundSymbol,
      );
      if (hasUstbPerm) {
        await allowListV2
          .connect(allowListOwner)
          .setProtocolAddressPermission(addr, fundSymbol, false);
      }
    }

    // Set entity ID
    const currentEntityId = await allowListV2.addressEntityIds(addr);
    if (currentEntityId.toNumber() !== entityId) {
      if (currentEntityId.toNumber() !== 0) {
        await allowListV2
          .connect(allowListOwner)
          .setEntityIdForAddress(0, addr);
      }
      await allowListV2
        .connect(allowListOwner)
        .setEntityIdForAddress(entityId, addr);
    }
  }

  // Ensure entity is allowed for fund
  const isAllowed = await allowListV2.isEntityAllowedForFund(
    entityId,
    fundSymbol,
  );
  if (!isAllowed) {
    await allowListV2
      .connect(allowListOwner)
      .setEntityAllowedForFund(entityId, fundSymbol, true);
  }
}
