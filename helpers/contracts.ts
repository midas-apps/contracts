import { MTokenName } from '../config';

export type TokenContractNames = {
  dv: string;
  dvUstb: string;
  rv: string;
  rvSwapper: string;
  rvBuidl: string;
  rvUstb: string;
  dataFeed?: string;
  customAggregator?: string;
  customAggregatorGrowth?: string;
  token: string;
  roles: string;
};

type CommonContractNames = Omit<TokenContractNames, 'token'> & {
  ac: string;
  customAggregator: string;
  customAggregatorDiscounted: string;
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
};

export const getCommonContractNames = (): CommonContractNames => {
  return {
    ac: 'MidasAccessControl',
    dv: 'DepositVault',
    dvUstb: 'DepositVaultWithUSTB',
    rv: 'RedemptionVault',
    rvSwapper: 'RedemptionVaultWithSwapper',
    rvBuidl: 'RedemptionVaultWIthBUIDL',
    rvUstb: 'RedemptionVaultWithUSTB',
    dataFeed: 'DataFeed',
    customAggregator: 'CustomAggregatorV3CompatibleFeed',
    customAggregatorGrowth: 'CustomAggregatorV3CompatibleFeedGrowth',
    customAggregatorDiscounted: 'CustomAggregatorV3CompatibleFeedDiscounted',
    roles: 'MidasAccessControlRoles',
  };
};

export const getTokenContractNames = (
  token: MTokenName,
): TokenContractNames => {
  const commonContractNames = getCommonContractNames();
  const prefix = contractNamesPrefixes[token];

  const isMtbill = token === 'mTBILL';
  const isTac = token.startsWith('TAC');
  const tokenPrefix = isMtbill ? '' : prefix;

  return {
    dv: `${tokenPrefix}${commonContractNames.dv}`,
    dvUstb: `${tokenPrefix}${commonContractNames.dvUstb}`,
    rv: `${tokenPrefix}${commonContractNames.rv}`,
    rvSwapper: `${tokenPrefix}${commonContractNames.rvSwapper}`,
    rvBuidl: `${tokenPrefix}${commonContractNames.rvBuidl}`,
    rvUstb: `${tokenPrefix}${commonContractNames.rvUstb}`,
    dataFeed: isTac ? undefined : `${prefix}${commonContractNames.dataFeed}`,
    customAggregator: isTac ? undefined : `${prefix}CustomAggregatorFeed`,
    customAggregatorGrowth: isTac
      ? undefined
      : `${prefix}CustomAggregatorFeedGrowth`,
    token: `${token}`,
    roles: `${prefix}${commonContractNames.roles}`,
  };
};
