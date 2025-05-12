export enum MTokenNameEnum {
  mTBILL = 'mTBILL',
  mBASIS = 'mBASIS',
  mBTC = 'mBTC',
  mEDGE = 'mEDGE',
  mRE7 = 'mRE7',
  mMEV = 'mMEV',
  mSL = 'mSL',
  mFONE = 'mFONE',
  hbUSDT = 'hbUSDT',
  TACmBTC = 'TACmBTC',
  TACmEDGE = 'TACmEDGE',
  TACmMEV = 'TACmMEV',
  mLIQUIDITY = 'mLIQUIDITY',
}

export type MTokenName = keyof typeof MTokenNameEnum;

export type PaymentTokenName =
  | 'usdc'
  | 'usdt'
  | 'dai'
  | 'm'
  | 'wbtc'
  | 'pusd'
  | 'wrbtc'
  | 'usds'
  | 'usde';
