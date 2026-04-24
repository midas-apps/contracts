import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { etherscanVerify, logDeploy } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const REGISTRY = '0x2D6e9F608807436DE5D9603B00Abe3FEd1Bc809d';
const EXPECTED_FORWARDER = '0x0b93082D9b3C7C97fAcd250082899BAcf3af3885';
const EXPECTED_AUTHOR = '0xFD1ebE54d435bDd9a81A4BF204756a20AeB7Ee71';

// bytes10(0x62396534366635623834) — ASCII-hex of `"b9e46f5b84"` =
// sha256("midas_por_attestation_prod")[0:5] re-encoded as 10 ASCII hex chars.
const ATTESTATION_WORKFLOW_NAME = '0x62396534366635623834';

// bytes10(0x34346265396532306639) — ASCII-hex of `"44be9e20f9"` =
// sha256("midas_por_verification_prod")[0:5] re-encoded as 10 ASCII hex chars.
const VERIFICATION_WORKFLOW_NAME = '0x34346265396532306639';

// Both attestation and verification workflows share `bytes32(0)` per the
// task spec. The constructor seeds this slot with the attestation name;
// the post-deploy `setWorkflowConfig` call below overwrites it with the
// verification name. The DON-side report selector
// (`setAttestation` vs `setVerification`) is what differentiates which
// registry call is made — not the workflow-config name check.
const WORKFLOW_ID = '0x' + '00'.repeat(32);
const IS_REPORT_WRITE_SECURED = true;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const initialOwner = await getWalletAddressForAction(
    hre,
    'cre-receiver-owner',
  );

  console.log('Deployer        :', await deployer.getAddress());
  console.log('Initial owner   :', initialOwner);
  console.log('Registry        :', REGISTRY);
  console.log('Forwarder       :', EXPECTED_FORWARDER);
  console.log('Author          :', EXPECTED_AUTHOR);
  console.log('Att. workflow   :', ATTESTATION_WORKFLOW_NAME);
  console.log('Ver. workflow   :', VERIFICATION_WORKFLOW_NAME);

  const factory = await hre.ethers.getContractFactory(
    'SaveCreReceiverProxy',
    deployer,
  );

  const constructorArgs = [
    REGISTRY,
    WORKFLOW_ID,
    EXPECTED_FORWARDER,
    EXPECTED_AUTHOR,
    ATTESTATION_WORKFLOW_NAME,
    IS_REPORT_WRITE_SECURED,
    initialOwner,
  ] as const;

  const proxy = await factory.deploy(...constructorArgs);
  logDeploy('SaveCreReceiverProxy', undefined, proxy.address);
  await proxy.deployTransaction.wait(2);

  await etherscanVerify(hre, proxy.address, ...constructorArgs).catch((e) => {
    console.error('Unable to verify SaveCreReceiverProxy. Error: ', e);
  });

  const setWorkflowTx = await proxy.populateTransaction.setWorkflowConfig(
    WORKFLOW_ID,
    EXPECTED_FORWARDER,
    EXPECTED_AUTHOR,
    VERIFICATION_WORKFLOW_NAME,
    true,
  );

  await sendAndWaitForCustomTxSign(
    hre,
    { ...setWorkflowTx, to: proxy.address },
    {
      action: 'cre-receiver-owner',
      comment: 'SaveCreReceiverProxy: register verification workflow',
    },
  );

  console.log('Done. Proxy:', proxy.address);
};

export default func;
