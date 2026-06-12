import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, constants, Contract, ContractTransaction } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  AccountOrContract,
  getAccount,
  handleRevert,
  OptionalCommonParams,
} from './common.helpers';

import {
  DepositVaultTest,
  DepositVaultTest__factory,
  DepositVaultWithAaveTest,
  DepositVaultWithAaveTest__factory,
  DepositVaultWithMorphoTest,
  DepositVaultWithMorphoTest__factory,
  DepositVaultWithMTokenTest,
  DepositVaultWithMTokenTest__factory,
  DepositVaultWithUSTBTest,
  DepositVaultWithUSTBTest__factory,
  ManageableVaultTester,
  ManageableVaultTester__factory,
  RedemptionVaultTest,
  RedemptionVaultTest__factory,
  RedemptionVaultWithAaveTest,
  RedemptionVaultWithAaveTest__factory,
  RedemptionVaultWithMorphoTest,
  RedemptionVaultWithMorphoTest__factory,
  RedemptionVaultWithMTokenTest,
  RedemptionVaultWithMTokenTest__factory,
  RedemptionVaultWithUSTBTest,
  RedemptionVaultWithUSTBTest__factory,
} from '../../typechain-types';

const DV_WITH_EXTRA_INIT =
  'initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,bool),(uint256,uint256,uint256),address)';

const RV_WITH_EXTRA_INIT =
  'initialize((uint256,uint256,uint256,address,address,address,address,address,uint256,uint256,uint256,bool),(address,address,address,address,uint256),address)';

export type InitializerParamsMv = {
  accessControl: AccountOrContract;
  mockedSanctionsList: AccountOrContract;
  mTBILL: AccountOrContract;
  mTokenToUsdDataFeed: AccountOrContract;
  tokensReceiver: AccountOrContract;
  minAmount?: BigNumberish;
  instantFee?: BigNumberish;
  limitConfigs?: {
    limit: BigNumberish;
    window: BigNumberish;
  }[];
  minInstantFee?: BigNumberish;
  maxInstantFee?: BigNumberish;
  maxInstantShare?: BigNumberish;
  variationTolerance?: BigNumberish;
  sequentialRequestProcessing?: boolean;
};

export type InitializerParamsDv = {
  maxAmountPerRequest?: BigNumberish;
  minMTokenAmountForFirstDeposit?: BigNumberish;
  maxSupplyCap?: BigNumberish;
} & InitializerParamsMv;

export type InitializerParamsDvWithUstb = {
  ustbToken: AccountOrContract;
} & InitializerParamsDv;

export type InitializerParamsDvWithMToken = {
  depositVault: AccountOrContract;
} & InitializerParamsDv;

export type InitializerParamsRv = {
  requestRedeemer: AccountOrContract;
  loanLp?: AccountOrContract;
  loanRepaymentAddress?: AccountOrContract;
  redemptionVaultLoanSwapper?: AccountOrContract;
  loanApr?: BigNumberish;
} & InitializerParamsMv;

export type InitializerParamsRvWithMToken = {
  redemptionVault: AccountOrContract;
} & InitializerParamsRv;

export type InitializerParamsRvWithUstb = {
  ustbRedemption: AccountOrContract;
} & InitializerParamsRv;

const resolveDeployer = async (opt?: OptionalCommonParams) => {
  if (opt?.from) {
    return opt.from;
  }

  const [deployer] = await ethers.getSigners();
  return deployer;
};

const initializeContract = async <TContract>(
  contract: TContract,
  initFn: () => Promise<ContractTransaction>,
  opt?: OptionalCommonParams,
): Promise<TContract> => {
  if (await handleRevert(initFn, contract as Contract, opt)) {
    return contract;
  }

  await expect(initFn()).to.not.be.reverted;
  return contract;
};

const deployIfNeeded = async <TContract>(
  contract: TContract | undefined,
  deploy: (deployer: SignerWithAddress) => Promise<TContract>,
  opt?: OptionalCommonParams,
): Promise<{ contract: TContract; deployer: SignerWithAddress }> => {
  const deployer = await resolveDeployer(opt);

  if (contract) {
    return { contract, deployer };
  }

  return {
    contract: await deploy(deployer),
    deployer,
  };
};

export const getInitializerParamsMv = ({
  accessControl,
  mockedSanctionsList,
  mTBILL,
  mTokenToUsdDataFeed,
  tokensReceiver,
  minAmount,
  instantFee,
  limitConfigs,
  minInstantFee,
  maxInstantFee,
  maxInstantShare,
  variationTolerance,
  sequentialRequestProcessing,
}: InitializerParamsMv) => {
  return [
    {
      ac: getAccount(accessControl),
      sanctionsList: getAccount(mockedSanctionsList),
      variationTolerance: variationTolerance ?? 1,
      minAmount: minAmount ?? 1000,
      mToken: getAccount(mTBILL),
      mTokenDataFeed: getAccount(mTokenToUsdDataFeed),
      tokensReceiver: getAccount(tokensReceiver),
      instantFee: instantFee ?? 100,
      limitConfigs: limitConfigs ?? [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: minInstantFee ?? 0,
      maxInstantFee: maxInstantFee ?? 10000,
      maxInstantShare: maxInstantShare ?? 100_00,
      sequentialRequestProcessing: sequentialRequestProcessing ?? false,
    },
  ] as const;
};

export const getInitializerParamsRv = <TExtraParams extends readonly [] = []>(
  {
    requestRedeemer,
    loanLp,
    loanRepaymentAddress,
    redemptionVaultLoanSwapper,
    loanApr,
    ...commonParams
  }: InitializerParamsRv,
  extraParams?: TExtraParams,
) => {
  return [
    ...getInitializerParamsMv(commonParams),
    {
      requestRedeemer: getAccount(requestRedeemer),
      loanLp: getAccount(loanLp ?? constants.AddressZero),
      loanRepaymentAddress: getAccount(
        loanRepaymentAddress ?? constants.AddressZero,
      ),
      loanSwapperVault: getAccount(
        redemptionVaultLoanSwapper ?? constants.AddressZero,
      ),
      loanApr: loanApr ?? 0,
    },
    ...(extraParams ?? []),
  ] as const;
};

export const getInitializerParamsRvWithMToken = ({
  redemptionVault,
  ...commonParams
}: InitializerParamsRvWithMToken) => {
  return [
    ...getInitializerParamsRv(commonParams),
    getAccount(redemptionVault),
  ] as const;
};

export const getInitializerParamsRvWithUstb = ({
  ustbRedemption,
  ...commonParams
}: InitializerParamsRvWithUstb) => {
  return [
    ...getInitializerParamsRv(commonParams),
    getAccount(ustbRedemption),
  ] as const;
};

export const getInitializerParamsDv = ({
  maxAmountPerRequest,
  minMTokenAmountForFirstDeposit,
  maxSupplyCap,
  ...commonParams
}: InitializerParamsDv) => {
  return [
    ...getInitializerParamsMv(commonParams),
    {
      minMTokenAmountForFirstDeposit: minMTokenAmountForFirstDeposit ?? 0,
      maxSupplyCap: maxSupplyCap ?? constants.MaxUint256,
      maxAmountPerRequest: maxAmountPerRequest ?? constants.MaxUint256,
    },
  ] as const;
};

export const getInitializerParamsDvWithUstb = ({
  ustbToken,
  ...commonParams
}: InitializerParamsDvWithUstb) => {
  return [
    ...getInitializerParamsDv(commonParams),
    getAccount(ustbToken),
  ] as const;
};

export const getInitializerParamsDvWithMToken = ({
  depositVault,
  ...commonParams
}: InitializerParamsDvWithMToken) => {
  return [
    ...getInitializerParamsDv(commonParams),
    getAccount(depositVault),
  ] as const;
};

export const initializeMv = async (
  params: InitializerParamsMv,
  contract?: ManageableVaultTester,
  opt?: OptionalCommonParams,
): Promise<ManageableVaultTester> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    (deployer) => new ManageableVaultTester__factory(deployer).deploy(),
    opt,
  );
  const initParams = getInitializerParamsMv(params);

  return initializeContract(
    vault,
    () =>
      vault.connect(opt?.from ?? deployer).initializeExternal(...initParams),
    opt,
  );
};

const initializeStandardDv = async <
  TContract extends
    | DepositVaultTest
    | DepositVaultWithAaveTest
    | DepositVaultWithMorphoTest,
>(
  params: InitializerParamsDv,
  contract: TContract | undefined,
  deploy: (deployer: SignerWithAddress) => Promise<TContract>,
  opt?: OptionalCommonParams,
): Promise<TContract> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    deploy,
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsDv(params);

  return initializeContract<TContract>(
    vault,
    () => vault.connect(from).initialize(...initParams),
    opt,
  );
};

export const initializeDv = (
  params: InitializerParamsDv,
  contract?: DepositVaultTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardDv(
    params,
    contract,
    (deployer) => new DepositVaultTest__factory(deployer).deploy(),
    opt,
  );

export const initializeDvWithAave = (
  params: InitializerParamsDv,
  contract?: DepositVaultWithAaveTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardDv(
    params,
    contract,
    (deployer) => new DepositVaultWithAaveTest__factory(deployer).deploy(),
    opt,
  );

export const initializeDvWithMorpho = (
  params: InitializerParamsDv,
  contract?: DepositVaultWithMorphoTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardDv(
    params,
    contract,
    (deployer) => new DepositVaultWithMorphoTest__factory(deployer).deploy(),
    opt,
  );

export const initializeDvWithUstb = async (
  params: InitializerParamsDvWithUstb,
  contract?: DepositVaultWithUSTBTest,
  opt?: OptionalCommonParams,
): Promise<DepositVaultWithUSTBTest> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    (deployer) => new DepositVaultWithUSTBTest__factory(deployer).deploy(),
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsDvWithUstb(params);

  return initializeContract(
    vault,
    () => vault.connect(from)[DV_WITH_EXTRA_INIT](...initParams),
    opt,
  );
};

export const initializeDvWithMToken = async (
  params: InitializerParamsDvWithMToken,
  contract?: DepositVaultWithMTokenTest,
  opt?: OptionalCommonParams,
): Promise<DepositVaultWithMTokenTest> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    (deployer) => new DepositVaultWithMTokenTest__factory(deployer).deploy(),
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsDvWithMToken(params);

  return initializeContract(
    vault,
    () => vault.connect(from)[DV_WITH_EXTRA_INIT](...initParams),
    opt,
  );
};

const initializeStandardRv = async <
  TContract extends
    | RedemptionVaultTest
    | RedemptionVaultWithAaveTest
    | RedemptionVaultWithMorphoTest,
>(
  params: InitializerParamsRv,
  contract: TContract | undefined,
  deploy: (deployer: SignerWithAddress) => Promise<TContract>,
  opt?: OptionalCommonParams,
): Promise<TContract> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    deploy,
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsRv(params);

  return initializeContract<TContract>(
    vault,
    () => vault.connect(from).initialize(...initParams),
    opt,
  );
};

export const initializeRv = (
  params: InitializerParamsRv,
  contract?: RedemptionVaultTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardRv(
    params,
    contract,
    (deployer) => new RedemptionVaultTest__factory(deployer).deploy(),
    opt,
  );

export const initializeRvWithAave = (
  params: InitializerParamsRv,
  contract?: RedemptionVaultWithAaveTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardRv(
    params,
    contract,
    (deployer) => new RedemptionVaultWithAaveTest__factory(deployer).deploy(),
    opt,
  );

export const initializeRvWithMorpho = (
  params: InitializerParamsRv,
  contract?: RedemptionVaultWithMorphoTest,
  opt?: OptionalCommonParams,
) =>
  initializeStandardRv(
    params,
    contract,
    (deployer) => new RedemptionVaultWithMorphoTest__factory(deployer).deploy(),
    opt,
  );

export const initializeRvWithUstb = async (
  params: InitializerParamsRvWithUstb,
  contract?: RedemptionVaultWithUSTBTest,
  opt?: OptionalCommonParams,
): Promise<RedemptionVaultWithUSTBTest> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    (deployer) => new RedemptionVaultWithUSTBTest__factory(deployer).deploy(),
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsRvWithUstb(params);

  return initializeContract(
    vault,
    () => vault.connect(from)[RV_WITH_EXTRA_INIT](...initParams),
    opt,
  );
};

export const initializeRvWithMToken = async (
  params: InitializerParamsRvWithMToken,
  contract?: RedemptionVaultWithMTokenTest,
  opt?: OptionalCommonParams,
): Promise<RedemptionVaultWithMTokenTest> => {
  const { contract: vault, deployer } = await deployIfNeeded(
    contract,
    (deployer) => new RedemptionVaultWithMTokenTest__factory(deployer).deploy(),
    opt,
  );
  const from = opt?.from ?? deployer;
  const initParams = getInitializerParamsRvWithMToken(params);

  return initializeContract(
    vault,
    () => vault.connect(from)[RV_WITH_EXTRA_INIT](...initParams),
    opt,
  );
};
