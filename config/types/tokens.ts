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
  hypeETH = 'hypeETH',
  hypeBTC = 'hypeBTC',
  hypeUSD = 'hypeUSD',
  tETH = 'tETH',
  tUSDe = 'tUSDe',
  tBTC = 'tBTC',
}

export type MTokenName = keyof typeof MTokenNameEnum;

export enum PaymentTokenNameEnum {
  usdc = 'usdc',
  usdt = 'usdt',
  dai = 'dai',
  m = 'm',
  wbtc = 'wbtc',
  pusd = 'pusd',
  wrbtc = 'wrbtc',
  usds = 'usds',
  usde = 'usde',
  usr = 'usr',
  stone = 'stone',
  weth = 'weth',
  cmeth = 'cmeth',
  weeth = 'weeth',
  susde = 'susde',
}

export type PaymentTokenName = keyof typeof PaymentTokenNameEnum;
