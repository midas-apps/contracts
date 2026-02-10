import { acremBTC1DeploymentConfig } from './acremBTC1';
import { cUSDODeploymentConfig } from './cUSDO';
import { dnETHDeploymentConfig } from './dnETH';
import { dnFARTDeploymentConfig } from './dnFART';
import { dnHYPEDeploymentConfig } from './dnHYPE';
import { dnPUMPDeploymentConfig } from './dnPUMP';
import { dnTESTDeploymentConfig } from './dnTEST';
import { hbUSDCDeploymentConfig } from './hbUSDC';
import { hbUSDTDeploymentConfig } from './hbUSDT';
import { hbXAUtDeploymentConfig } from './hbXAUt';
import { hypeBTCDeploymentConfig } from './hypeBTC';
import { hypeETHDeploymentConfig } from './hypeETH';
import { hypeUSDDeploymentConfig } from './hypeUSD';
import { JIVDeploymentConfig } from './JIV';
import { kitBTCDeploymentConfig } from './kitBTC';
import { kitHYPEDeploymentConfig } from './kitHYPE';
import { kitUSDDeploymentConfig } from './kitUSD';
import { kmiUSDDeploymentConfig } from './kmiUSD';
import { liquidHYPEDeploymentConfig } from './liquidHYPE';
import { liquidRESERVEDeploymentConfig } from './liquidRESERVE';
import { lstHYPEDeploymentConfig } from './lstHYPE';
import { mAPOLLODeploymentConfig } from './mAPOLLO';
import { mBASISDeploymentConfig } from './mBASIS';
import { mBTCDeploymentConfig } from './mBTC';
import { mEDGEDeploymentConfig } from './mEDGE';
import { mevBTCDeploymentConfig } from './mevBTC';
import { mEVUSDDeploymentConfig } from './mEVUSD';
import { mFARMDeploymentConfig } from './mFARM';
import { mFONEDeploymentConfig } from './mFONE';
import { mHYPERDeploymentConfig } from './mHYPER';
import { mHyperBTCDeploymentConfig } from './mHyperBTC';
import { mHyperETHDeploymentConfig } from './mHyperETH';
import { mKRalphaDeploymentConfig } from './mKRalpha';
import { mLIQUIDITYDeploymentConfig } from './mLIQUIDITY';
import { mMEVDeploymentConfig } from './mMEV';
import { mPortofinoDeploymentConfig } from './mPortofino';
import { mRE7DeploymentConfig } from './mRE7';
import { mRE7BTCDeploymentConfig } from './mRE7BTC';
import { mRE7SOLDeploymentConfig } from './mRE7SOL';
import { mROXDeploymentConfig } from './mROX';
import { mSLDeploymentConfig } from './mSL';
import { msyrupUSDDeploymentConfig } from './msyrupUSD';
import { msyrupUSDpDeploymentConfig } from './msyrupUSDp';
import { mTBILLDeploymentConfig } from './mTBILL';
import { mWildUSDDeploymentConfig } from './mWildUSD';
import { mXRPDeploymentConfig } from './mXRP';
import { obeatUSDDeploymentConfig } from './obeatUSD';
import { plUSDDeploymentConfig } from './plUSD';
import { sLINJDeploymentConfig } from './sLINJ';
import { splUSDDeploymentConfig } from './splUSD';
import { TACmBTCDeploymentConfig } from './tac/TACmBTC';
import { TACmEDGEDeploymentConfig } from './tac/TACmEDGE';
import { TACmMEVDeploymentConfig } from './tac/TACmMEV';
import { tacTONDeploymentConfig } from './tacTON';
import { tBTCDeploymentConfig } from './tBTC';
import { tETHDeploymentConfig } from './tETH';
import { tUSDeDeploymentConfig } from './tUSDe';
import { wNLPDeploymentConfig } from './wNLP';
import { wVLPDeploymentConfig } from './wVLP';
import { zeroGBTCVDeploymentConfig } from './zeroGBTCV';
import { zeroGETHVDeploymentConfig } from './zeroGETHV';
import { zeroGUSDVDeploymentConfig } from './zeroGUSDV';

import { MTokenName } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const configsPerToken: Record<MTokenName, DeploymentConfig> = {
  mTBILL: mTBILLDeploymentConfig,
  mLIQUIDITY: mLIQUIDITYDeploymentConfig,
  mBASIS: mBASISDeploymentConfig,
  mSL: mSLDeploymentConfig,
  hbUSDT: hbUSDTDeploymentConfig,
  mBTC: mBTCDeploymentConfig,
  mEDGE: mEDGEDeploymentConfig,
  mFONE: mFONEDeploymentConfig,
  mHYPER: mHYPERDeploymentConfig,
  mAPOLLO: mAPOLLODeploymentConfig,
  mMEV: mMEVDeploymentConfig,
  mRE7: mRE7DeploymentConfig,
  TACmBTC: TACmBTCDeploymentConfig,
  TACmEDGE: TACmEDGEDeploymentConfig,
  TACmMEV: TACmMEVDeploymentConfig,
  hypeETH: hypeETHDeploymentConfig,
  hypeBTC: hypeBTCDeploymentConfig,
  hypeUSD: hypeUSDDeploymentConfig,
  tETH: tETHDeploymentConfig,
  tUSDe: tUSDeDeploymentConfig,
  tBTC: tBTCDeploymentConfig,
  hbXAUt: hbXAUtDeploymentConfig,
  mRE7SOL: mRE7SOLDeploymentConfig,
  mevBTC: mevBTCDeploymentConfig,
  lstHYPE: lstHYPEDeploymentConfig,
  liquidHYPE: liquidHYPEDeploymentConfig,
  hbUSDC: hbUSDCDeploymentConfig,
  mFARM: mFARMDeploymentConfig,
  wVLP: wVLPDeploymentConfig,
  dnHYPE: dnHYPEDeploymentConfig,
  kmiUSD: kmiUSDDeploymentConfig,
  msyrupUSD: msyrupUSDDeploymentConfig,
  msyrupUSDp: msyrupUSDpDeploymentConfig,
  dnPUMP: dnPUMPDeploymentConfig,
  zeroGUSDV: zeroGUSDVDeploymentConfig,
  zeroGETHV: zeroGETHVDeploymentConfig,
  zeroGBTCV: zeroGBTCVDeploymentConfig,
  JIV: JIVDeploymentConfig,
  mRE7BTC: mRE7BTCDeploymentConfig,
  kitUSD: kitUSDDeploymentConfig,
  kitHYPE: kitHYPEDeploymentConfig,
  kitBTC: kitBTCDeploymentConfig,
  dnFART: dnFARTDeploymentConfig,
  mXRP: mXRPDeploymentConfig,
  acremBTC1: acremBTC1DeploymentConfig,
  mWildUSD: mWildUSDDeploymentConfig,
  plUSD: plUSDDeploymentConfig,
  splUSD: splUSDDeploymentConfig,
  tacTON: tacTONDeploymentConfig,
  wNLP: wNLPDeploymentConfig,
  dnETH: dnETHDeploymentConfig,
  dnTEST: dnTESTDeploymentConfig,
  obeatUSD: obeatUSDDeploymentConfig,
  mEVUSD: mEVUSDDeploymentConfig,
  cUSDO: cUSDODeploymentConfig,
  mHyperETH: mHyperETHDeploymentConfig,
  mHyperBTC: mHyperBTCDeploymentConfig,
  mPortofino: mPortofinoDeploymentConfig,
  liquidRESERVE: liquidRESERVEDeploymentConfig,
  mKRalpha: mKRalphaDeploymentConfig,
  sLINJ: sLINJDeploymentConfig,
  mROX: mROXDeploymentConfig,
};
