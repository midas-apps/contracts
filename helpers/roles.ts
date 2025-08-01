import { constants } from 'ethers';
import { solidityKeccak256 } from 'ethers/lib/utils';

import { MTokenName } from '../config';

const prefixes: Record<MTokenName, string> = {
  mTBILL: 'M_TBILL',
  mBASIS: 'M_BASIS',
  mBTC: 'M_BTC',
  mEDGE: 'M_EDGE',
  mMEV: 'M_MEV',
  mRE7: 'M_RE7',
  mRE7SOL: 'M_RE7SOL',
  mSL: 'M_SL',
  hbUSDT: 'HB_USDT',
  hbXAUt: 'HB_XAUT',
  mFONE: 'M_FONE',
  mHYPER: 'M_HYPER',
  mAPOLLO: 'M_APOLLO',
  mLIQUIDITY: 'M_LIQUIDITY',
  hypeETH: 'HYPE_ETH',
  hypeBTC: 'HYPE_BTC',
  hypeUSD: 'HYPE_USD',
  tETH: 'T_ETH',
  tUSDe: 'T_USDE',
  tBTC: 'T_BTC',
  mevBTC: 'MEV_BTC',
  lstHYPE: 'LST_HYPE',
  liquidHYPE: 'LIQUID_HYPE',
  TACmBTC: 'TAC_M_BTC',
  TACmEDGE: 'TAC_M_EDGE',
  TACmMEV: 'TAC_M_MEV',
};

const mappedTokenNames: Partial<Record<MTokenName, string>> = {
  mFONE: 'mF-ONE',
};

type TokenRoles = {
  minter: string;
  burner: string;
  pauser: string;
  depositVaultAdmin: string;
  redemptionVaultAdmin: string;
  customFeedAdmin: string | null;
};

type CommonRoles = {
  blacklisted: string;
  greenlisted: string;
  greenlistedOperator: string;
  blacklistedOperator: string;
  defaultAdmin: string;
};

type AllRoles = {
  common: CommonRoles;
  tokenRoles: Record<MTokenName, TokenRoles>;
};

const keccak256 = (role: string) => {
  return solidityKeccak256(['string'], [role]);
};

export const getRolesNamesForToken = (token: MTokenName): TokenRoles => {
  const isMTBILL = token === 'mTBILL';
  const isTAC = token.startsWith('TAC');

  const tokenPrefix = prefixes[token];
  const restPrefix = isMTBILL ? '' : tokenPrefix + '_';

  return {
    minter: `${tokenPrefix}_MINT_OPERATOR_ROLE`,
    burner: `${tokenPrefix}_BURN_OPERATOR_ROLE`,
    pauser: `${tokenPrefix}_PAUSE_OPERATOR_ROLE`,
    customFeedAdmin: isTAC
      ? null
      : `${tokenPrefix}_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE`,
    depositVaultAdmin: `${restPrefix}DEPOSIT_VAULT_ADMIN_ROLE`,
    redemptionVaultAdmin: `${restPrefix}REDEMPTION_VAULT_ADMIN_ROLE`,
  };
};
export const getRolesNamesCommon = (): CommonRoles => {
  return {
    defaultAdmin: 'DEFAULT_ADMIN_ROLE',
    greenlisted: 'GREENLISTED_ROLE',
    greenlistedOperator: 'GREENLIST_OPERATOR_ROLE',
    blacklisted: 'BLACKLISTED_ROLE',
    blacklistedOperator: 'BLACKLIST_OPERATOR_ROLE',
  };
};

export const getRolesForToken = (token: MTokenName): TokenRoles => {
  const rolesNames = getRolesNamesForToken(token);
  return Object.fromEntries(
    Object.entries(rolesNames).map(([key, value]) => {
      return [key, value ? keccak256(value) : '-'];
    }),
  ) as TokenRoles;
};

export const getAllRoles = (): AllRoles => {
  const rolesNamesCommon = getRolesNamesCommon();
  return {
    common: {
      defaultAdmin: constants.HashZero,
      greenlisted: keccak256(rolesNamesCommon.greenlisted),
      greenlistedOperator: keccak256(rolesNamesCommon.greenlistedOperator),
      blacklisted: keccak256(rolesNamesCommon.blacklisted),
      blacklistedOperator: keccak256(rolesNamesCommon.blacklistedOperator),
    },
    tokenRoles: Object.fromEntries(
      Object.keys(prefixes).map((token) => [
        mappedTokenNames[token as MTokenName] ?? token,
        getRolesForToken(token as MTokenName),
      ]),
    ) as Record<MTokenName, TokenRoles>,
  };
};
