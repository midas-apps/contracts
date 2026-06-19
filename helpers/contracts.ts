import { MTokenName } from '../config';
import { VaultType } from '../config/constants/addresses';

export type TokenContractNames = {
  dv: string;
  dvUstb: string;
  dvAave: string;
  dvMorpho: string;
  dvMToken: string;
  rv: string;
  rvSwapper: string;
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

const vaultTypeToContractNameMap: Record<VaultType, string> = {
  redemptionVault: 'rv',
  redemptionVaultSwapper: 'rvSwapper',
  redemptionVaultMToken: 'rvMToken',
  redemptionVaultUstb: 'rvUstb',
  depositVault: 'dv',
  depositVaultUstb: 'dvUstb',
  depositVaultAave: 'dvAave',
  depositVaultMorpho: 'dvMorpho',
  depositVaultMToken: 'dvMToken',
  redemptionVaultAave: 'rvAave',
  redemptionVaultMorpho: 'rvMorpho',
  redemptionVaultBuidl: 'rvBuidl',
};

export const vaultTypeToContractName = (
  vaultType: VaultType,
): string | undefined => {
  return vaultTypeToContractNameMap[vaultType];
};

export const contractNameToVaultType = (
  contractName: string,
): VaultType | undefined => {
  return Object.entries(vaultTypeToContractNameMap).find(
    ([, value]) => value === contractName,
  )?.[0] as VaultType | undefined;
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
};

export const getCommonContractNames = (): CommonContractNames => {
  return {
    ac: 'MidasAccessControl',
    pauseManager: 'MidasPauseManager',
    timelockManager: 'MidasTimelockManager',
    timelockController: 'MidasAccessControlTimelockController',
    dv: 'DepositVault',
    token: 'mToken',
    tokenPermissioned: 'mTokenPermissioned',
    dvUstb: 'DepositVaultWithUSTB',
    dvAave: 'DepositVaultWithAave',
    dvMorpho: 'DepositVaultWithMorpho',
    dvMToken: 'DepositVaultWithMToken',
    rv: 'RedemptionVault',
    rvSwapper: 'RedemptionVaultWithSwapper',
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
