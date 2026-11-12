import { getRolesForToken } from './roles';

import { MTokenName } from '../config';
import {
  V2VaultType,
  VaultType,
  isV2VaultType,
} from '../config/constants/vaults';

export type TokenContractNames = {
  dv: string;
  dvUstb: string;
  dvAave: string;
  dvMorpho: string;
  dvMToken: string;
  rv: string;
  rvMToken: string;
  rvUstb: string;
  rvAave: string;
  rvMorpho: string;
  dataFeed: string;
  dataFeedComposite: string;
  dataFeedMultiply: string;
  customAggregator?: string;
  customAggregatorGrowth?: string;
  token: string;
  tokenPermissioned: string;
  roles: string;
};

type CommonContractNames = TokenContractNames & {
  ac: string;
  pauseManager: string;
  timelockManager: string;
  timelockController: string;
  customAggregator: string;
  customAggregatorAdjusted: string;
  layerZero: {
    oftAdapter: string;
    vaultComposer: string;
  };
};

/** Only v2 vaults have sources (and artifacts) in this repo */
const vaultTypeToContractNameMap: Record<
  V2VaultType,
  keyof TokenContractNames
> = {
  redemptionVault: 'rv',
  redemptionVaultMToken: 'rvMToken',
  redemptionVaultUstb: 'rvUstb',
  depositVault: 'dv',
  depositVaultUstb: 'dvUstb',
  depositVaultAave: 'dvAave',
  depositVaultMorpho: 'dvMorpho',
  depositVaultMToken: 'dvMToken',
  redemptionVaultAave: 'rvAave',
  redemptionVaultMorpho: 'rvMorpho',
};

/**
 * Short contract name key of a v2 vault type.
 * Returns undefined for v1-only vault types (Swapper, BUIDL)
 */
export const vaultTypeToContractName = (
  vaultType: VaultType,
): keyof TokenContractNames | undefined => {
  return isV2VaultType(vaultType)
    ? vaultTypeToContractNameMap[vaultType]
    : undefined;
};

export const contractNameToVaultType = (
  contractName: string,
): V2VaultType | undefined => {
  return Object.entries(vaultTypeToContractNameMap).find(
    ([, value]) => value === contractName,
  )?.[0] as V2VaultType | undefined;
};

/** v2 vault constructor args: (contract admin role, greenlisted role) */
export const getV2VaultConstructorArgs = (
  mToken: MTokenName,
  vaultType: V2VaultType,
): string[] => {
  const roles = getRolesForToken(mToken);
  const adminRole = vaultType.startsWith('depositVault')
    ? roles.depositVaultAdmin
    : roles.redemptionVaultAdmin;

  if (!adminRole) {
    throw new Error(`Vault admin role is not found for ${mToken}`);
  }

  return [adminRole, roles.greenlisted];
};

export const contractNamesPrefixes: Record<MTokenName, string> = {
  mTBILL: 'MTBill',
  mBASIS: 'MBasis',
  mBTC: 'MBtc',
  mEDGE: 'MEdge',
  mRE7: 'MRe7',
  mRE7SOL: 'MRe7Sol',
  mMEV: 'MMev',
  mSL: 'MSl',
  mFONE: 'MFOne',
  mHYPER: 'MHyper',
  mAPOLLO: 'MApollo',
  hbUSDT: 'HBUsdt',
  hbXAUt: 'HBXaut',
  mLIQUIDITY: 'MLiquidity',
  hypeETH: 'HypeEth',
  hypeBTC: 'HypeBtc',
  hypeUSD: 'HypeUsd',
  TACmBTC: 'TACmBtc',
  TACmEDGE: 'TACmEdge',
  TACmMEV: 'TACmMev',
  tETH: 'TEth',
  tUSDe: 'TUsde',
  tBTC: 'TBtc',
  mevBTC: 'MevBtc',
  lstHYPE: 'LstHype',
  liquidHYPE: 'LiquidHype',
  hbUSDC: 'HBUsdc',
  mFARM: 'MFarm',
  wVLP: 'WVLP',
  dnHYPE: 'DnHype',
  kmiUSD: 'KmiUsd',
  msyrupUSD: 'MSyrupUsd',
  msyrupUSDp: 'MSyrupUsdp',
  dnPUMP: 'DnPump',
  zeroGUSDV: 'ZeroGUsdv',
  zeroGETHV: 'ZeroGEthv',
  zeroGBTCV: 'ZeroGBtcv',
  JIV: 'Jiv',
  mRE7BTC: 'MRe7Btc',
  kitUSD: 'KitUsd',
  kitHYPE: 'KitHype',
  kitBTC: 'KitBtc',
  dnFART: 'DnFart',
  mXRP: 'MXrp',
  mWildUSD: 'MWildUsd',
  plUSD: 'PlUsd',
  splUSD: 'SplUsd',
  tacTON: 'TacTon',
  wNLP: 'WNlp',
  dnETH: 'DnEth',
  dnTEST: 'DnTest',
  acremBTC1: 'AcreMBtc1',
  obeatUSD: 'ObeatUsd',
  mEVUSD: 'MEvUsd',
  cUSDO: 'CUsdo',
  mHyperETH: 'MHyperEth',
  mHyperBTC: 'MHyperBtc',
  mPortofino: 'MPortofino',
  liquidRESERVE: 'LiquidReserve',
  mKRalpha: 'MKRalpha',
  sLINJ: 'SLInj',
  mROX: 'MRox',
  weEUR: 'WeEur',
  mTU: 'MTu',
  mM1USD: 'MM1Usd',
  mRe7ETH: 'MRe7Eth',
  mGLOBAL: 'MGlobal',
  bondUSD: 'BondUsd',
  bondETH: 'BondEth',
  bondBTC: 'BondBtc',
  mTEST: 'MTest',
  stockMarketTRBasisTrade: 'StockMarketTRBasisTrade',
  carryTradeUSDTRYLeverage: 'CarryTradeUsdTryLeverage',
  mEVETH: 'MEvEth',
  liquidRWA: 'LiquidRwa',
  mWIN: 'MWin',
  qHVNUSD: 'QHVNUsd',
  mGLO: 'MGlo',
  sGold: 'SGold',
  turtlePST: 'TurtlePst',
  mM1BTC: 'MM1Btc',
  mGLOeuro: 'MGloEuro',
  mALPHA: 'MAlpha',
  Re7YIELD: 'Re7YIELD',
  Re7BTC: 'Re7BTC',
  Re7ETH: 'Re7ETH',
  mArb: 'MArb',
  mArbBTC: 'MArbBTC',
  mArbETH: 'MArbETH',
  mFTAC: 'MFTac',
  moriniGoldYield: 'MoriniGoldYield',
  moriniBTCYield: 'MoriniBTCYield',
  radUSD: 'RadUsd',
  radYC: 'RadYc',
  dvUSD: 'DvUsd',
};

export const getCommonContractNames = (): CommonContractNames => {
  return {
    ac: 'MidasAccessControl',
    pauseManager: 'MidasPauseManager',
    timelockManager: 'MidasTimelockManager',
    timelockController: 'MidasAccessControlTimelockController',
    dv: 'DepositVault',
    token: 'mToken',
    tokenPermissioned: 'mToken',
    dvUstb: 'DepositVaultWithUSTB',
    dvAave: 'DepositVaultWithAave',
    dvMorpho: 'DepositVaultWithMorpho',
    dvMToken: 'DepositVaultWithMToken',
    rv: 'RedemptionVault',
    rvMToken: 'RedemptionVaultWithMToken',
    rvUstb: 'RedemptionVaultWithUSTB',
    rvAave: 'RedemptionVaultWithAave',
    rvMorpho: 'RedemptionVaultWithMorpho',
    dataFeed: 'DataFeed',
    customAggregator: 'CustomAggregatorV3CompatibleFeed',
    customAggregatorGrowth: 'CustomAggregatorV3CompatibleFeedGrowth',
    customAggregatorAdjusted: 'CustomAggregatorV3CompatibleFeedAdjusted',
    roles: 'MidasAccessControlRoles',
    dataFeedComposite: 'CompositeDataFeed',
    dataFeedMultiply: 'CompositeDataFeedMultiply',
    layerZero: {
      oftAdapter: 'MidasLzMintBurnOFTAdapter',
      vaultComposer: 'MidasLzVaultComposerSync',
    },
  };
};

// TODO: remove this function
export const getTokenContractNames = (
  _token: MTokenName,
): TokenContractNames => {
  const commonContractNames = getCommonContractNames();

  return commonContractNames;
};
