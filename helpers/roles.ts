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
  mSL: 'M_SL',
  hbUSDT: 'HB_USDT',
  mFONE: 'M_FONE',
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
  customFeedAdmin: string;
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

const getRolesForToken = (token: MTokenName): TokenRoles => {
  const isMTBILL = token === 'mTBILL';
  const isTAC = token.startsWith('TAC');

  const tokenPrefix = prefixes[token];
  const restPrefix = isMTBILL ? '' : tokenPrefix + '_';

  return {
    minter: keccak256(`${tokenPrefix}_MINT_OPERATOR_ROLE`),
    burner: keccak256(`${tokenPrefix}_BURN_OPERATOR_ROLE`),
    pauser: keccak256(`${tokenPrefix}_PAUSE_OPERATOR_ROLE`),
    customFeedAdmin: isTAC
      ? '-'
      : keccak256(`${tokenPrefix}_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE`),
    depositVaultAdmin: keccak256(`${restPrefix}DEPOSIT_VAULT_ADMIN_ROLE`),
    redemptionVaultAdmin: keccak256(`${restPrefix}REDEMPTION_VAULT_ADMIN_ROLE`),
  };
};

export const getAllRoles = (): AllRoles => ({
  common: {
    defaultAdmin: constants.HashZero,
    greenlisted: keccak256('GREENLISTED_ROLE'),
    greenlistedOperator: keccak256('GREENLIST_OPERATOR_ROLE'),
    blacklisted: keccak256('BLACKLISTED_ROLE'),
    blacklistedOperator: keccak256('BLACKLIST_OPERATOR_ROLE'),
  },
  tokenRoles: Object.fromEntries(
    Object.keys(prefixes).map((token) => [
      mappedTokenNames[token as MTokenName] ?? token,
      getRolesForToken(token as MTokenName),
    ]),
  ) as Record<MTokenName, TokenRoles>,
});
