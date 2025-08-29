import { dnHYPEDeploymentConfig } from './dnHYPE';
import { dnPUMPDeploymentConfig } from './dnPUMP';
import { hbUSDCDeploymentConfig } from './hbUSDC';
import { hbUSDTDeploymentConfig } from './hbUSDT';
import { hbXAUtDeploymentConfig } from './hbXAUt';
import { hypeBTCDeploymentConfig } from './hypeBTC';
import { hypeETHDeploymentConfig } from './hypeETH';
import { hypeUSDDeploymentConfig } from './hypeUSD';
import { kmiUSDDeploymentConfig } from './kmiUSD';
import { liquidHYPEDeploymentConfig } from './liquidHYPE';
import { lstHYPEDeploymentConfig } from './lstHYPE';
import { mAPOLLODeploymentConfig } from './mAPOLLO';
import { mBASISDeploymentConfig } from './mBASIS';
import { mBTCDeploymentConfig } from './mBTC';
import { mEDGEDeploymentConfig } from './mEDGE';
import { mevBTCDeploymentConfig } from './mevBTC';
import { mFARMDeploymentConfig } from './mFARM';
import { mFONEDeploymentConfig } from './mFONE';
import { mHYPERDeploymentConfig } from './mHYPER';
import { mLIQUIDITYDeploymentConfig } from './mLIQUIDITY';
import { mMEVDeploymentConfig } from './mMEV';
import { mRE7DeploymentConfig } from './mRE7';
import { mRE7SOLDeploymentConfig } from './mRE7SOL';
import { mSLDeploymentConfig } from './mSL';
import { msyrupUSDDeploymentConfig } from './msyrupUSD';
import { mTBILLDeploymentConfig } from './mTBILL';
import { TACmBTCDeploymentConfig } from './tac/TACmBTC';
import { TACmEDGEDeploymentConfig } from './tac/TACmEDGE';
import { TACmMEVDeploymentConfig } from './tac/TACmMEV';
import { tBTCDeploymentConfig } from './tBTC';
import { tETHDeploymentConfig } from './tETH';
import { tUSDeDeploymentConfig } from './tUSDe';
import { wVLPDeploymentConfig } from './wVLP';

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
  dnPUMP: dnPUMPDeploymentConfig,
};
