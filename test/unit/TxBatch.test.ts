import { expect } from 'chai';
import { constants } from 'ethers';

import { batchTxs } from '../../scripts/deploy/common/tx-batch';
import { PlannedTx, TxSignMetadata } from '../../scripts/deploy/common/utils';
import {
  MidasAccessControl__factory,
  MidasPauseManager__factory,
} from '../../typechain-types';

const ac = MidasAccessControl__factory.createInterface();
const pm = MidasPauseManager__factory.createInterface();

const AC = '0x00000000000000000000000000000000000000ac';
const PM = '0x00000000000000000000000000000000000000aa';
const VAULT_A = '0x000000000000000000000000000000000000000a';
const VAULT_B = '0x000000000000000000000000000000000000000b';
const ROLE_A = `0x${'a'.repeat(64)}`;
const ROLE_B = `0x${'b'.repeat(64)}`;
const SEL_A = '0xaaaaaaaa';
const SEL_B = '0xbbbbbbbb';

const planned = (
  to: string,
  data: string,
  metadata: TxSignMetadata,
): PlannedTx => ({ tx: { to, data }, metadata });

const grant = (role: string, account: string, comment: string) =>
  planned(
    AC,
    ac.encodeFunctionData('grantRoleMult', [[{ role, account, delay: 0 }]]),
    { action: 'update-ac', comment },
  );

const pauseFn = (vault: string, selectors: string[], comment: string) =>
  planned(
    PM,
    pm.encodeFunctionData('bulkPauseContractFn', [[vault], selectors]),
    { action: 'update-pause-manager', mToken: 'mTBILL', comment },
  );

const other = planned(VAULT_A, '0x12345678', {
  action: 'update-vault',
  comment: 'other',
});

describe('batchTxs', function () {
  it('merges grantRoleMult calls in place of the first one', () => {
    const txs = batchTxs([
      grant(ROLE_A, VAULT_A, 'a'),
      other,
      grant(ROLE_B, VAULT_B, 'b'),
    ]);

    expect(txs).to.have.length(2);
    expect(txs[1]).to.equal(other);
    expect(txs[0].metadata?.comment).to.equal('a; b');

    const [params] = ac.decodeFunctionData('grantRoleMult', txs[0].tx.data!);
    expect(params.map((p: { role: string }) => p.role)).to.deep.equal([
      ROLE_A,
      ROLE_B,
    ]);
    expect(
      params.map((p: { account: string }) => p.account.toLowerCase()),
    ).to.deep.equal([VAULT_A, VAULT_B]);
  });

  it('does not merge calls from different actions', () => {
    const fromOtherWallet = {
      ...grant(ROLE_B, VAULT_B, 'b'),
      metadata: { action: 'deployer' as const, comment: 'b' },
    };

    expect(
      batchTxs([grant(ROLE_A, VAULT_A, 'a'), fromOtherWallet]),
    ).to.have.length(2);
  });

  it('merges bulkPauseContractFn only for the same selectors', () => {
    const txs = batchTxs([
      pauseFn(VAULT_A, [SEL_A, SEL_B], 'a'),
      pauseFn(VAULT_B, [SEL_B, SEL_A], 'b'),
      pauseFn(VAULT_B, [SEL_A], 'c'),
    ]);

    expect(txs).to.have.length(2);

    const [contracts, selectors] = pm.decodeFunctionData(
      'bulkPauseContractFn',
      txs[0].tx.data!,
    );
    expect(contracts.map((v: string) => v.toLowerCase())).to.deep.equal([
      VAULT_A,
      VAULT_B,
    ]);
    expect(selectors).to.deep.equal([SEL_A, SEL_B]);
    expect(txs[1].metadata?.comment).to.equal('c');
  });

  it('leaves single and unknown calls untouched', () => {
    const single = grant(ROLE_A, constants.AddressZero, 'a');
    const txs = batchTxs([single, other]);

    expect(txs[0]).to.equal(single);
    expect(txs[1]).to.equal(other);
  });
});
