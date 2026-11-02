import { setCode } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, constants, PopulatedTransaction, Wallet } from 'ethers';
import hre from 'hardhat';

import { createServer, IncomingMessage, Server } from 'http';
import { AddressInfo } from 'net';

import { ENV } from '../../../config';
import {
  safeAbi,
  sendAndWaitForCustomTxSign,
} from '../../../scripts/deploy/common/utils';

const safeInterface = new hre.ethers.utils.Interface(safeAbi);

const target = Wallet.createRandom().address;
const targetData = '0x12345678';
const safeTxHash = '0x' + 'ab'.repeat(32);

describe('sendAndWaitForCustomTxSign', () => {
  const originalEnv = {
    BACKOFFICE_API_URL: ENV.BACKOFFICE_API_URL,
    BACKOFFICE_SERVICE_TOKEN: ENV.BACKOFFICE_SERVICE_TOKEN,
    FORKING_NETWORK: ENV.FORKING_NETWORK,
  };
  const provider = hre.ethers.provider;
  const originalSend = hre.network.provider.send;

  let server: Server;
  let backofficeUrl: string;
  let requests: { req: IncomingMessage; body: string }[];
  let reply: { status: number; body: unknown };
  let safe: string;
  let deployer: string;
  let threshold: number;
  let owners: string[];

  before(async () => {
    ({ deployer } = await hre.getNamedAccounts());

    server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        requests.push({ req, body });
        res.writeHead(reply.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    backofficeUrl = `http://127.0.0.1:${
      (server.address() as AddressInfo).port
    }`;

    // no Safe bytecode available locally, so fake its reads
    hre.network.provider.send = async (method, params) => {
      const [tx] = (params ?? []) as { to?: string; data?: string }[];
      if (
        method === 'eth_call' &&
        tx.to?.toLowerCase() === safe.toLowerCase() &&
        tx.data
      ) {
        const fn = safeInterface.getFunction(tx.data.slice(0, 10));
        if (fn.name === 'getOwners') {
          return safeInterface.encodeFunctionResult(fn, [owners]);
        }
        if (fn.name === 'getThreshold') {
          return safeInterface.encodeFunctionResult(fn, [threshold]);
        }
      }
      return originalSend.call(hre.network.provider, method, params);
    };
  });

  after(() => {
    hre.network.provider.send = originalSend;
    server.close();
  });

  beforeEach(async () => {
    // never hit a real backoffice configured in .env
    Object.assign(ENV, {
      BACKOFFICE_API_URL: undefined,
      BACKOFFICE_SERVICE_TOKEN: undefined,
    });
    requests = [];
    reply = {
      status: 201,
      body: { proposalId: 'proposal-1', safeTxHash, nonce: '7' },
    };
    owners = [deployer];
    safe = Wallet.createRandom().address;
    // STOP opcode: getCode is non-empty and execTransaction does not revert
    await setCode(safe, '0x00');
  });

  afterEach(() => {
    Object.assign(ENV, originalEnv);
  });

  const setBackofficeEnv = () =>
    Object.assign(ENV, {
      BACKOFFICE_API_URL: backofficeUrl,
      BACKOFFICE_SERVICE_TOKEN: 'test-token',
    });

  const send = ({
    wallet = safe,
    tx = { to: target, data: targetData },
    metadata = {},
  }: {
    wallet?: string;
    tx?: PopulatedTransaction;
    metadata?: { comment?: string; idempotenceId?: string };
  } = {}) =>
    sendAndWaitForCustomTxSign(
      hre,
      tx,
      {
        action: 'update-timelock',
        comment: 'test comment',
        idempotenceId: 'test-idempotence-id',
        ...metadata,
      },
      wallet,
      1,
    );

  const expectedExecTxData = () =>
    safeInterface.encodeFunctionData('execTransaction', [
      target,
      0,
      targetData,
      0,
      0,
      0,
      0,
      constants.AddressZero,
      constants.AddressZero,
      '0x000000000000000000000000' +
        deployer.slice(2).toLowerCase() +
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '01',
    ]);

  it('threshold 2 with backoffice env: posts a proposal, sends no tx', async () => {
    setBackofficeEnv();
    threshold = 2;
    const nonceBefore = await provider.getTransactionCount(deployer);

    const res = await send();

    expect(res).deep.eq({ proposalId: 'proposal-1', safeTxHash });
    expect(requests).length(1);
    const [{ req, body }] = requests;
    expect(req.method).eq('POST');
    expect(req.url).eq('/api/safe/proposals');
    expect(req.headers['x-authorization']).eq('Bearer test-token');
    expect(req.headers.authorization).eq(undefined);
    expect(JSON.parse(body)).deep.eq({
      chainId: hre.network.config.chainId,
      safe,
      to: target,
      value: '0',
      data: targetData,
      comment: 'test comment',
      idempotenceId: 'test-idempotence-id',
    });
    expect(await provider.getTransactionCount(deployer)).eq(nonceBefore);
  });

  it('threshold 2 with tx without data: proposes empty calldata', async () => {
    setBackofficeEnv();
    threshold = 2;

    await send({ tx: { to: target, value: BigNumber.from(5) } });

    expect(JSON.parse(requests[0].body)).include({ data: '0x', value: '5' });
  });

  it('threshold 2 with backoffice 400: throws its status and body', async () => {
    setBackofficeEnv();
    threshold = 2;
    reply = {
      status: 400,
      body: { message: ['comment must not contain a link'], statusCode: 400 },
    };

    await expect(send()).rejectedWith(
      'Backoffice proposal failed: 400 {"message":["comment must not contain a link"]',
    );
  });

  it('threshold 2 without explicit idempotenceId: distinct id per tx', async () => {
    setBackofficeEnv();
    threshold = 2;

    for (const data of [targetData, '0x87654321']) {
      await send({
        tx: { to: target, data },
        metadata: { idempotenceId: undefined },
      });
    }

    const [first, second] = requests.map(
      (r) => JSON.parse(r.body).idempotenceId as string,
    );
    expect(first.startsWith(`${hre.contextId}:`)).eq(true);
    expect(first).match(/^[\w.:-]{1,64}$/);
    expect(first).not.eq(second);
  });

  it('threshold 2 with caller not a Safe owner: still proposes', async () => {
    setBackofficeEnv();
    threshold = 2;
    owners = [Wallet.createRandom().address];

    await send();

    expect(requests).length(1);
  });

  it('threshold 1 with caller not a Safe owner: throws', async () => {
    threshold = 1;
    owners = [Wallet.createRandom().address];

    await expect(send()).rejectedWith('is not found in the safe contract');
  });

  it('threshold 2 on a fork: throws before proposing', async () => {
    setBackofficeEnv();
    Object.assign(ENV, { FORKING_NETWORK: 'main' });
    threshold = 2;

    await expect(send()).rejectedWith('proposals are disabled on forks');
    expect(requests).length(0);
  });

  for (const [label, env] of [
    ['no backoffice env', {}],
    ['only BACKOFFICE_API_URL', { BACKOFFICE_API_URL: 'http://127.0.0.1:1' }],
    [
      'only BACKOFFICE_SERVICE_TOKEN',
      { BACKOFFICE_SERVICE_TOKEN: 'test-token' },
    ],
  ] as const) {
    it(`threshold 2 with ${label}: throws before sending`, async () => {
      Object.assign(ENV, env);
      threshold = 2;
      const nonceBefore = await provider.getTransactionCount(deployer);

      await expect(send()).rejectedWith(
        'set BACKOFFICE_API_URL and BACKOFFICE_SERVICE_TOKEN',
      );
      expect(requests).length(0);
      expect(await provider.getTransactionCount(deployer)).eq(nonceBefore);
    });
  }

  for (const withEnv of [false, true]) {
    it(`threshold 1 ${
      withEnv ? 'with' : 'without'
    } backoffice env: execTransaction with prevalidated signature, no proposal`, async () => {
      if (withEnv) setBackofficeEnv();
      threshold = 1;

      const hash = (await send()) as string;

      const tx = await provider.getTransaction(hash);
      expect(tx.to).eq(safe);
      expect(tx.data).eq(expectedExecTxData());
      expect(requests).length(0);
    });
  }

  it('EOA as safe wallet: warns and sends directly', async () => {
    setBackofficeEnv();
    const eoa = Wallet.createRandom().address;
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(...args);

    let hash: string;
    try {
      hash = (await send({ wallet: eoa })) as string;
    } finally {
      console.warn = originalWarn;
    }

    expect(warnings).include(
      'Safe wallet is passed but caller is not a contract',
    );
    const tx = await provider.getTransaction(hash);
    expect(tx.to).eq(target);
    expect(tx.data).eq(targetData);
    expect(requests).length(0);
  });
});
