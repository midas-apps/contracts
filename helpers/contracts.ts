import { MTokenName } from '../config';

export type TokenContractNames = {
  dv: string;
  rv: string;
  rvSwapper: string;
  rvBuidl: string;
  rvUstb: string;
  dataFeed?: string;
  customAggregator?: string;
  token: string;
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
};

export const getCommonContractNames = (): CommonContractNames => {
  return {
    ac: 'MidasAccessControl',
    dv: 'DepositVault',
    rv: 'RedemptionVault',
    rvSwapper: 'RedemptionVaultWithSwapper',
    rvBuidl: 'RedemptionVaultWithBUIDL',
    rvUstb: 'RedemptionVaultWithUSTB',
    dataFeed: 'DataFeed',
    customAggregator: 'CustomAggregatorV3CompatibleFeed',
    customAggregatorDiscounted: 'CustomAggregatorV3CompatibleFeedDiscounted',
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
    rv: `${tokenPrefix}${commonContractNames.rv}`,
    rvSwapper: `${tokenPrefix}${commonContractNames.rvSwapper}`,
    rvBuidl: `${tokenPrefix}${commonContractNames.rvBuidl}`,
    rvUstb: `${tokenPrefix}${commonContractNames.rvUstb}`,
    dataFeed: isTac ? undefined : `${prefix}${commonContractNames.dataFeed}`,
    customAggregator: isTac ? undefined : `${prefix}CustomAggregatorFeed`,
    token: `${token}`,
  };
};
