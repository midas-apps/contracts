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
import { ethers } from 'hardhat';

import { DefaultFixture } from './fixtures';

import {
  ERC20,
  ERC20__factory,
  ERC20Mock,
  IERC20Metadata,
  MidasPauseManager,
  MToken,
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

// TODO: rename to pauseContracts
export const pauseVault = async (
  { pauseManager, owner }: PauseParams,
  contracts: Contract | Contract[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const contractsArr = Array.isArray(contracts) ? contracts : [contracts];

  if (
    await handleRevert(
      pauseManager.connect(from).bulkPauseContract.bind(
        this,
        contractsArr.map((c) => c.address),
      ),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager
      .connect(from)
      .bulkPauseContract(contractsArr.map((c) => c.address)),
  ).not.reverted;

  for (const contract of contractsArr) {
    expect(await pauseManager.isPaused(contract.address, '0x00000000')).eq(
      true,
    );
    expect(await pauseManager.contractPaused(contract.address)).eq(true);
  }
};

// TODO: rename to unpauseContracts
export const unpauseVault = async (
  { owner, pauseManager }: PauseParams,
  contracts: Contract | Contract[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const contractsArr = Array.isArray(contracts) ? contracts : [contracts];

  if (
    await handleRevert(
      pauseManager.connect(from).bulkUnpauseContract.bind(
        this,
        contractsArr.map((c) => c.address),
      ),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager
      .connect(from)
      .bulkUnpauseContract(contractsArr.map((c) => c.address)),
  ).not.reverted;

  for (const contract of contractsArr) {
    expect(await pauseManager.isPaused(contract.address, '0x00000000')).eq(
      false,
    );
    expect(await pauseManager.contractPaused(contract.address)).eq(false);
  }
};

// TODO: rename to pauseContractsFn
export const pauseVaultFn = async (
  { pauseManager, owner }: PauseParams,
  contracts: Contract | Contract[],
  fnSelector: string | string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const selectors = Array.isArray(fnSelector) ? fnSelector : [fnSelector];

  const contractsArr = Array.isArray(contracts) ? contracts : [contracts];

  if (
    await handleRevert(
      pauseManager.connect(from).bulkPauseContractFn.bind(
        this,
        contractsArr.map((c) => c.address),
        selectors,
      ),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager.connect(from).bulkPauseContractFn(
      contractsArr.map((c) => c.address),
      selectors,
    ),
  ).not.reverted;

  for (const contract of contractsArr) {
    for (const fnSelector of selectors) {
      expect(await pauseManager.isPaused(contract.address, fnSelector)).eq(
        true,
      );
      expect(
        await pauseManager.contractFnPaused(contract.address, fnSelector),
      ).eq(true);
    }
  }
};

// TODO: rename to unpauseContractsFn
export const unpauseVaultFn = async (
  { pauseManager, owner }: PauseParams,
  contracts: Contract | Contract[],
  fnSelector: string | string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const selectors = Array.isArray(fnSelector) ? fnSelector : [fnSelector];

  const contractsArr = Array.isArray(contracts) ? contracts : [contracts];
  if (
    await handleRevert(
      pauseManager.connect(from).bulkUnpauseContractFn.bind(
        this,
        contractsArr.map((c) => c.address),
        selectors,
      ),
      pauseManager,
      opt,
    )
  ) {
    return;
  }

  await expect(
    await pauseManager.connect(from).bulkUnpauseContractFn(
      contractsArr.map((c) => c.address),
      selectors,
    ),
  ).not.reverted;

  for (const contract of contractsArr) {
    for (const fnSelector of selectors) {
      expect(await pauseManager.isPaused(contract.address, fnSelector)).eq(
        false,
      );
      expect(
        await pauseManager.contractFnPaused(contract.address, fnSelector),
      ).eq(false);
    }
  }
};

export const adminPauseContractTest = async (
  { pauseManager, owner }: PauseParams,
  contract: Contract,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (
    await handleRevert(
      pauseManager
        .connect(from)
        .contractAdminPause.bind(this, contract.address),
      pauseManager,
      opt,
    )
  ) {
    return;
  }
  await expect(pauseManager.connect(from).contractAdminPause(contract.address))
    .not.reverted;

  expect(await pauseManager.contractPaused(contract.address)).eq(true);
  expect(await pauseManager.isPaused(contract.address, '0x00000000')).eq(true);
};

export const adminUnpauseContractTest = async (
  { pauseManager, owner }: PauseParams,
  contract: Contract,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  if (
    await handleRevert(
      pauseManager
        .connect(from)
        .contractAdminUnpause.bind(this, contract.address),
      pauseManager,
      opt,
    )
  ) {
    return;
  }
  await expect(
    pauseManager.connect(from).contractAdminUnpause(contract.address),
  ).not.reverted;

  expect(await pauseManager.contractPaused(contract.address)).eq(false);
  expect(await pauseManager.isPaused(contract.address, '0x00000000')).eq(false);
};

export const mintToken = async (
  token: ERC20Mock | MToken | USTBMock,
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
export type Constructor<T = unknown> = new (...args: any[]) => T;

export const validateImplementation = async (
  _implementationFactory: Constructor<ContractFactory> | ContractFactory,
) => {
  // FIXME: hardhat-upgrades call fails because it does not accept the constructor arguments
  // const factory =
  //   typeof implementationFactory === 'function'
  //     ? new implementationFactory()
  //     : implementationFactory;
  // await hre.upgrades.validateImplementation(factory);
};

export type InitializeParamCase<TParams> = {
  title: string;
  params:
    | Partial<TParams>
    | ((
        fixture: DefaultFixture,
        contract?: Contract,
      ) => Partial<TParams> | Promise<Partial<TParams>>);
  contract?:
    | Contract
    | ((fixture: DefaultFixture) => Contract | Promise<Contract>);
  revertCustomError: {
    customErrorName: string;
    args?:
      | unknown[]
      | ((fixture: DefaultFixture, contract?: Contract) => unknown[]);
  };
};

export type InitializeParamsOpt = OptionalCommonParams & {
  contract?: Contract;
};

const runInitializeParamCase = async <TParams>(
  fixture: DefaultFixture,
  paramCase: InitializeParamCase<TParams>,
  initializeFunction: (
    fixture: DefaultFixture,
    params: Partial<TParams>,
    opt?: InitializeParamsOpt,
  ) => Promise<void>,
) => {
  const contract =
    paramCase.contract === undefined
      ? undefined
      : typeof paramCase.contract === 'function'
      ? await paramCase.contract(fixture)
      : paramCase.contract;

  const params =
    typeof paramCase.params === 'function'
      ? await paramCase.params(fixture, contract)
      : paramCase.params;

  const args =
    typeof paramCase.revertCustomError.args === 'function'
      ? paramCase.revertCustomError.args(fixture, contract)
      : paramCase.revertCustomError.args;

  await initializeFunction(fixture, params, {
    contract,
    revertCustomError: {
      customErrorName: paramCase.revertCustomError.customErrorName,
      args,
    },
  });
};

export const initializeParamsSuits = <TParams>(
  paramCases: InitializeParamCase<TParams>[],
  fixtureFn: () => Promise<DefaultFixture>,
  initializeFunction: (
    fixture: DefaultFixture,
    params: Partial<TParams>,
    opt?: InitializeParamsOpt,
  ) => Promise<void>,
) => {
  describe('initialization params', () => {
    for (const paramCase of paramCases) {
      it(`should fail: when ${paramCase.title}`, async () => {
        const fixture = await fixtureFn();
        await runInitializeParamCase(fixture, paramCase, initializeFunction);
      });
    }
  });
};
