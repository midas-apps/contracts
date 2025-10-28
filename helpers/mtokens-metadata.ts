import { MTokenName } from '../config';

export const mTokensMetadata: Record<
  MTokenName,
  { name: string; symbol: string }
> = {
  mTBILL: {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
  },
  mBASIS: {
    name: 'Midas Basis Trading Token',
    symbol: 'mBASIS',
  },
  mBTC: {
    name: 'Midas BTC Yield Token',
    symbol: 'mBTC',
  },
  mEDGE: {
    name: 'Midas mEDGE',
    symbol: 'mEDGE',
  },
  mRE7: {
    name: 'Midas Re7 Yield',
    symbol: 'mRe7YIELD',
  },
  mRE7SOL: {
    name: 'Midas Re7SOL',
    symbol: 'mRe7SOL',
  },
  mMEV: {
    name: 'Midas MEV',
    symbol: 'mMEV',
  },
  mSL: {
    name: 'Midas Staked Liquidity',
    symbol: 'mSL',
  },
  mFONE: {
    name: 'Midas Fasanara ONE',
    symbol: 'mF-ONE',
  },
  mHYPER: {
    name: 'Midas Hyperithm',
    symbol: 'mHYPER',
  },
  mAPOLLO: {
    name: 'Midas Apollo Crypto',
    symbol: 'mAPOLLO',
  },
  hbUSDT: {
    name: 'Hyperbeat USDT',
    symbol: 'hbUSDT',
  },
  hypeBTC: {
    name: 'HyperBTC Vault',
    symbol: 'hypeBTC',
  },
  hypeETH: {
    name: 'HyperETH Vault',
    symbol: 'hypeETH',
  },
  hypeUSD: {
    name: 'HyperUSD Vault',
    symbol: 'hypeUSD',
  },
  TACmBTC: {
    name: 'Midas TACmBTC Token',
    symbol: 'TACmBTC',
  },
  TACmEDGE: {
    name: 'Midas TACmEDGE Token',
    symbol: 'TACmEDGE',
  },
  TACmMEV: {
    name: 'Midas TACmMEV Token',
    symbol: 'TACmMEV',
  },
  mLIQUIDITY: {
    name: 'Midas mLIQUIDITY',
    symbol: 'mLIQUIDITY',
  },
  tUSDe: {
    name: 'Terminal USDe',
    symbol: 'tUSDe',
  },
  tBTC: {
    name: 'Terminal WBTC',
    symbol: 'tBTC',
  },
  tETH: {
    name: 'Terminal WETH',
    symbol: 'tETH',
  },
  hbXAUt: {
    name: 'Hyperbeat XAUt',
    symbol: 'hbXAUt',
  },
  mevBTC: {
    name: 'Bitcoin MEV Capital',
    symbol: 'mevBTC',
  },
  lstHYPE: {
    name: 'Hyperbeat LST Vault',
    symbol: 'lstHYPE',
  },
  liquidHYPE: {
    name: 'Liquid HYPE Yield',
    symbol: 'liquidHYPE',
  },
  hbUSDC: {
    name: 'Hyperbeat USDC',
    symbol: 'hbUSDC',
  },
  mFARM: {
    name: 'Midas Farm Capital',
    symbol: 'mFARM',
  },
  wVLP: {
    name: 'Hyperbeat VLP',
    symbol: 'wVLP',
  },
  dnHYPE: {
    name: 'Delta Neutral HYPE',
    symbol: 'dnHYPE',
  },
  kmiUSD: {
    name: 'Katana miUSD',
    symbol: 'kmiUSD',
  },
  msyrupUSD: {
    name: 'syrupUSDC supercharged',
    symbol: 'msyrupUSD',
  },
  msyrupUSDp: {
    name: 'Plasma syrupUSD Pre-deposit Midas Vault',
    symbol: 'msyrupUSDp',
  },
  dnPUMP: {
    name: 'Delta Neutral PUMP',
    symbol: 'dnPUMP',
  },
  zeroGUSDV: {
    name: '0G USD Vault',
    symbol: '0gUSDV',
  },
  zeroGETHV: {
    name: '0G ETH Vault',
    symbol: '0gETHV',
  },
  zeroGBTCV: {
    name: '0G BTC Vault',
    symbol: '0gBTCV',
  },
  JIV: {
    name: 'Jaine Insurance Vault',
    symbol: 'JIV',
  },
  mRE7BTC: {
    name: 'Midas Re7 BTC',
    symbol: 'mRe7BTC',
  },
  kitUSD: {
    name: 'Kitchen Pre-deposit $kitUSD',
    symbol: '$kitUSD',
  },
  kitHYPE: {
    name: 'Kitchen Pre-deposit $kitHYPE',
    symbol: '$kitHYPE',
  },
  kitBTC: {
    name: 'Kitchen Pre-deposit $kitBTC',
    symbol: '$kitBTC',
  },
  dnFART: {
    name: 'Delta Neutral FART',
    symbol: 'dnFART',
  },
  mXRP: {
    name: 'Midas XRP',
    symbol: 'mXRP',
  },
  acreBTC: {
    name: 'acreBTC',
    symbol: 'acreBTC',
  },
  mWildUSD: {
    name: 'mWildUSD',
    symbol: 'mWildUSD',
  },
  plUSD: {
    name: 'Plasma USD',
    symbol: 'plUSD',
  },
  splUSD: {
    name: 'Staked Plasma USD',
    symbol: 'splUSD',
  },
  tacTON: {
    name: 'tacTON',
    symbol: 'tacTON',
  },
  wNLP: {
    name: 'Nunch wNLP',
    symbol: 'wNLP',
  },
  dnETH: {
    name: 'Delta Neutral ETH',
    symbol: 'dnETH',
  },
  dnTEST: {
    name: 'Delta Neutral TEST',
    symbol: 'dnTEST',
  },
  obeatUSD: {
    name: 'OmniBeat USD',
    symbol: 'obeatUSD',
  },
  mEVUSD: {
    name: 'Midas Everstake USD',
    symbol: 'mEVUSD',
  },
  cUSDO: {
    name: 'cUSDO BNB Midas Vault',
    symbol: 'cUSDO',
  },
  mHyperETH: {
    name: 'Midas Hyperithm ETH',
    symbol: 'mHyperETH',
  },
  mHyperBTC: {
    name: 'Midas Hyperithm BTC',
    symbol: 'mHyperBTC',
  },
  mPortofino: {
    name: 'Midas Portofino',
    symbol: 'mPortofino',
  },
};
