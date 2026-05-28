import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractFactory,
  ContractTransaction,
} from 'ethers';
import { parseUnits, solidityKeccak256 } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';

import {
  ERC20,
  ERC20__factory,
  ERC20Mock,
  IERC20Metadata,
  MidasPauseManager,
  MTBILL,
  Pausable,
  USTBMock,
} from '../../typechain-types';

type RevertCustomError = {
  contract?: Contract;
  customErrorName: string;
  args?: unknown[];
};

export type OptionalCommonParams =
  | {
      from?: SignerWithAddress;
      revertMessage?: string;
    }
  | {
      from?: SignerWithAddress;
      revertCustomError: RevertCustomError;
    }
  | {
      from?: SignerWithAddress;
      revertCustomError: (
        args?: unknown[],
        contract?: Contract,
      ) => RevertCustomError;
    };

export type Account = SignerWithAddress | string;
export type AccountOrContract = Account | Contract;

export const keccak256 = (role: string) => {
  return solidityKeccak256(['string'], [role]);
};

export const shouldRevert = (opt?: OptionalCommonParams) => {
  return (
    opt &&
    (('revertMessage' in opt && opt.revertMessage) ||
      ('revertCustomError' in opt && opt.revertCustomError))
  );
};

export const handleRevert = async (
  txOrTxFn: (() => Promise<ContractTransaction>) | Promise<ContractTransaction>,
  contract: Contract,
  opt?: OptionalCommonParams,
) => {
  if (!opt || !shouldRevert(opt)) return false;

  const getPromise = () =>
    typeof txOrTxFn === 'function' ? txOrTxFn() : txOrTxFn;

  if ('revertCustomError' in opt && opt.revertCustomError) {
    const txPromise = getPromise();
    const revertCustomError =
      typeof opt.revertCustomError === 'function'
        ? opt.revertCustomError(undefined, contract)
        : opt.revertCustomError;

    const match = expect(txPromise).revertedWithCustomError(
      revertCustomError.contract ?? contract,
      revertCustomError.customErrorName,
    );

    await (revertCustomError.args
      ? match.withArgs(...revertCustomError.args)
      : match);

    return true;
  } else if ('revertMessage' in opt && opt.revertMessage) {
    const txPromise = getPromise();
    await expect(txPromise).revertedWith(opt.revertMessage);
    return true;
  } else {
    return false;
  }
};

export const getAccount = (account: AccountOrContract) => {
  return (
    (account as SignerWithAddress).address ??
    (account as Contract).address ??
    (account as string)
  );
};

type PauseParams = {
  pauseManager: MidasPauseManager;
  owner: SignerWithAddress;
};

export const pauseGlobalTest = async (
  { pauseManager, owner }: PauseParams,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = pauseManager.connect(from).globalPause.bind(this);

  if (await handleRevert(callFn, pauseManager, opt)) {
    return;
  }

  await expect(callFn()).not.reverted;

  expect(await pauseManager.globalPaused()).eq(true);
};

export const unpauseGlobalTest = async (
  { pauseManager, owner }: PauseParams,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (
    await handleRevert(
      pauseManager.connect(from).globalUnpause.bind(this),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(await pauseManager.connect(from).globalUnpause()).not.reverted;

  expect(await pauseManager.globalPaused()).eq(false);
};

export const pauseVault = async (
  { pauseManager, owner }: PauseParams,
  vault: Pausable,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (
    await handleRevert(
      pauseManager.connect(from).pauseContract.bind(this, vault.address),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(await pauseManager.connect(from).pauseContract(vault.address))
    .not.reverted;

  expect(await pauseManager.isPaused(vault.address, '0x00000000')).eq(true);
  expect(await pauseManager.contractPaused(vault.address)).eq(true);
};

export const unpauseVault = async (
  { owner, pauseManager }: PauseParams,
  vault: Pausable,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (
    await handleRevert(
      pauseManager.connect(from).unpauseContract.bind(this, vault.address),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(await pauseManager.connect(from).unpauseContract(vault.address))
    .not.reverted;

  expect(await pauseManager.isPaused(vault.address, '0x00000000')).eq(false);
  expect(await pauseManager.contractPaused(vault.address)).eq(false);
};

export const pauseVaultFn = async (
  { pauseManager, owner }: PauseParams,
  vault: Pausable,
  fnSelector: string | string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const selectors = Array.isArray(fnSelector) ? fnSelector : [fnSelector];

  if (
    await handleRevert(
      pauseManager
        .connect(from)
        .bulkPauseContractFn.bind(this, vault.address, selectors),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager
      .connect(from)
      .bulkPauseContractFn(vault.address, selectors),
  ).not.reverted;

  for (const fnSelector of selectors) {
    expect(await pauseManager.isPaused(vault.address, fnSelector)).eq(true);
    expect(await pauseManager.contractFnPaused(vault.address, fnSelector)).eq(
      true,
    );
  }
};

export const unpauseVaultFn = async (
  { pauseManager, owner }: PauseParams,
  vault: Pausable,
  fnSelector: string | string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const selectors = Array.isArray(fnSelector) ? fnSelector : [fnSelector];

  if (
    await handleRevert(
      pauseManager
        .connect(from)
        .bulkUnpauseContractFn.bind(this, vault.address, selectors),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager
      .connect(from)
      .bulkUnpauseContractFn(vault.address, selectors),
  ).not.reverted;

  for (const fnSelector of selectors) {
    expect(await pauseManager.isPaused(vault.address, fnSelector)).eq(false);
    expect(await pauseManager.contractFnPaused(vault.address, fnSelector)).eq(
      false,
    );
  }
};

export const mintToken = async (
  token: ERC20Mock | MTBILL | USTBMock,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountFromBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await token.mint(to, amount);
};

export const approveBase18 = async (
  from: SignerWithAddress,
  token: ERC20 | IERC20Metadata,
  to: AccountOrContract,
  amountN: number,
) => {
  to = getAccount(to);
  const amount = await tokenAmountToBase18(
    token,
    parseUnits(amountN.toString()),
  );
  await expect(token.connect(from).approve(to, amount)).not.reverted;
};

export const approve = async (
  from: SignerWithAddress,
  token: ERC20 | IERC20Metadata,
  to: AccountOrContract,
  amount: BigNumberish,
) => {
  to = getAccount(to);
  await expect(token.connect(from).approve(to, amount)).not.reverted;
};

export const amountToBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1')).div(parseUnits('1', decimals));
};

export const amountFromBase18 = async (
  decimals: BigNumberish,
  amount: BigNumberish,
) => {
  amount = BigNumber.from(amount);
  return amount.mul(parseUnits('1', decimals)).div(parseUnits('1'));
};

export const tokenAmountToBase18 = async (
  token: ERC20 | IERC20Metadata,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountToBase18(decimals, amount);
};

export const tokenAmountFromBase18 = async (
  token: ERC20 | IERC20Metadata,
  amount: BigNumberish,
) => {
  const decimals = await token.decimals();
  return amountFromBase18(decimals, amount);
};

export const balanceOfBase18 = async (
  token: ERC20 | IERC20Metadata | string,
  of: AccountOrContract,
) => {
  if (typeof token === 'string') {
    token = ERC20__factory.connect(token, ethers.provider);
  }

  if (token.address === ethers.constants.AddressZero)
    return ethers.constants.Zero;
  of = getAccount(of);
  const balance = await token.balanceOf(of);
  return tokenAmountToBase18(token, balance);
};

export const getCurrentBlockTimestamp = async () => {
  return (await ethers.provider.getBlock('latest')).timestamp;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = unknown> = new (...args: any[]) => T;

export const validateImplementation = async (
  implementationFactory: Constructor<ContractFactory> | ContractFactory,
) => {
  const factory =
    typeof implementationFactory === 'function'
      ? new implementationFactory()
      : implementationFactory;

  await hre.upgrades.validateImplementation(factory);
};
