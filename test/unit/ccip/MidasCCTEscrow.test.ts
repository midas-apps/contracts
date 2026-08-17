import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract, Signer, constants } from 'ethers';
import { ethers, network, upgrades } from 'hardhat';

import { ccipV2LaneFixture } from '../../common/ccip-v2.fixture';
import {
  RecoveryStatus,
  ccipEscrow,
  expectedRecoveryId,
} from '../../common/ccip.helpers';

type Lane = Awaited<ReturnType<typeof ccipV2LaneFixture>>;

type RecoveryRecord = {
  originalSender: string;
  originalRecipient: string;
  originalSourceChainSelector: BigNumber;
  amount: BigNumber;
  status: number;
  returnable: boolean;
  outboundCcipMessageId: string;
};

const deploy = async (name: string, ...args: unknown[]) => {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
};

const impersonate = async (address: string) => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  await network.provider.send('hardhat_setBalance', [
    address,
    '0x56BC75E2D63100000',
  ]);
  return ethers.getSigner(address);
};

const deployUninitializedEscrow = async () => {
  const factory = await ethers.getContractFactory('MidasCCTFallbackEscrow');
  const implementation = await factory.deploy();
  await implementation.deployed();
  const proxyFactory = await ethers.getContractFactory('ERC1967Proxy');
  const proxy = await proxyFactory.deploy(implementation.address, '0x');
  await proxy.deployed();
  return factory.attach(proxy.address);
};

const deployPool = async (params: {
  token: string;
  rmn: string;
  router: string;
}) => {
  const factory = await ethers.getContractFactory('MidasCCTBurnMintTokenPool');
  const pool = await factory.deploy(params.token, params.rmn, params.router);
  await pool.deployed();
  return pool;
};

const readRecovery = async (
  escrow: Contract,
  recoveryId: string,
): Promise<RecoveryRecord> => {
  const recovery = (await ccipEscrow(escrow.address, escrow.signer).recoveries(
    recoveryId,
  )) as RecoveryRecord;
  return {
    ...recovery,
    originalSourceChainSelector: BigNumber.from(
      recovery.originalSourceChainSelector,
    ),
    amount: BigNumber.from(recovery.amount),
    status: Number(recovery.status),
  };
};

const expectedId = async (
  lane: Lane,
  nonce: BigNumberish,
  originalRecipient: string,
  amount: BigNumberish,
  originalSender = lane.alice.address,
) =>
  expectedRecoveryId({
    chainId: (await ethers.provider.getNetwork()).chainId,
    escrow: lane.b.escrow.address,
    nonce,
    originalSender,
    originalRecipient,
    sourceSelector: lane.a.selector,
    amount,
  });

const registerRecovery = async (params: {
  lane: Lane;
  originalSender?: string;
  originalRecipient?: string;
  amount?: BigNumberish;
  fund?: BigNumberish;
}) => {
  const {
    lane,
    originalSender = lane.alice.address,
    originalRecipient = lane.bob.address,
    amount = 1,
    fund = amount,
  } = params;
  if (!BigNumber.from(fund).isZero()) {
    await lane.b.token.mint(lane.b.escrow.address, fund);
  }
  const escrow = ccipEscrow(
    lane.b.escrow.address,
    await impersonate(lane.b.pool.address),
  );
  const count = await escrow.recoveryCount();
  const recoveryId = await expectedId(
    lane,
    count,
    originalRecipient,
    amount,
    originalSender,
  );
  const transaction = await escrow.onFallbackMinted(
    originalSender,
    originalRecipient,
    lane.a.selector,
    amount,
  );
  return { recoveryId, transaction };
};

const seedRecovery = async (params: {
  lane: Lane;
  originalSender?: string;
  originalRecipient?: string;
  amount?: BigNumberish;
}) => {
  return (await registerRecovery(params)).recoveryId;
};

const readEscrowAccounting = async (escrow: Contract) => {
  const recoveryEscrow = ccipEscrow(escrow.address, escrow.signer);
  return {
    pending: (await recoveryEscrow.pendingCount()) as BigNumber,
    reserve: (await recoveryEscrow.totalReserved()) as BigNumber,
  };
};

const claimSnapshot = async (lane: Lane, recoveryId: string) => {
  const record = await readRecovery(lane.b.escrow, recoveryId);
  const accounting = await readEscrowAccounting(lane.b.escrow);
  return {
    bob: (await lane.b.token.balanceOf(lane.bob.address)).toString(),
    carol: (await lane.b.token.balanceOf(lane.carol.address)).toString(),
    escrow: (await lane.b.token.balanceOf(lane.b.escrow.address)).toString(),
    record: {
      ...record,
      originalSourceChainSelector:
        record.originalSourceChainSelector.toString(),
      amount: record.amount.toString(),
    },
    accounting: {
      pending: accounting.pending.toString(),
      reserve: accounting.reserve.toString(),
    },
  };
};

const adminRecoverOriginalRecipients = async (
  lane: Lane,
  signer: Signer,
  recoveryIds: string[],
) => {
  const recoveries = await Promise.all(
    recoveryIds.map(async (recoveryId) => ({
      recoveryId,
      recipient: (
        await readRecovery(lane.b.escrow, recoveryId)
      ).originalRecipient,
    })),
  );
  return ccipEscrow(lane.b.escrow.address, signer).adminRecoverBulk(recoveries);
};

const confiscateRecoveries = async (
  lane: Lane,
  signer: Signer,
  recoveryIds: string[],
) => ccipEscrow(lane.b.escrow.address, signer).confiscateBulk(recoveryIds);

const batchSnapshot = async (lane: Lane, recoveryIds: string[]) => ({
  bob: (await lane.b.token.balanceOf(lane.bob.address)).toString(),
  carol: (await lane.b.token.balanceOf(lane.carol.address)).toString(),
  defaultRecipient: (
    await lane.b.token.balanceOf(lane.defaultRecipient.address)
  ).toString(),
  escrow: (await lane.b.token.balanceOf(lane.b.escrow.address)).toString(),
  records: await Promise.all(
    recoveryIds.map(async (recoveryId) => {
      const record = await readRecovery(lane.b.escrow, recoveryId);
      return {
        recoveryId,
        originalSender: record.originalSender,
        originalRecipient: record.originalRecipient,
        originalSourceChainSelector:
          record.originalSourceChainSelector.toString(),
        amount: record.amount.toString(),
        status: record.status,
        returnable: record.returnable,
        outboundCcipMessageId: record.outboundCcipMessageId,
      };
    }),
  ),
  accounting: {
    pending: (await readEscrowAccounting(lane.b.escrow)).pending.toString(),
    reserve: (await readEscrowAccounting(lane.b.escrow)).reserve.toString(),
  },
});

const reentrantEscrowFixture = async () => {
  const lane = await ccipV2LaneFixture();
  const token = await deploy('mTokenPermissionedReentrantTest');
  await token.initialize(lane.accessControl.address);
  const pool = await deployPool({
    token: token.address,
    rmn: lane.b.rmn.address,
    router: lane.b.router.address,
  });
  const escrow = await upgrades.deployProxy(
    await ethers.getContractFactory('MidasCCTFallbackEscrow'),
    [lane.accessControl.address, pool.address, lane.defaultRecipient.address],
  );
  await pool.setFallbackReceiver(escrow.address);

  const minterRole = await token.M_TOKEN_TEST_MINT_OPERATOR_ROLE();
  const burnerRole = await token.M_TOKEN_TEST_BURN_OPERATOR_ROLE();
  const greenlistedRole = await token.M_TOKEN_TEST_GREENLISTED_ROLE();
  await lane.accessControl.grantRole(minterRole, lane.owner.address);
  await lane.accessControl.grantRole(minterRole, pool.address);
  await lane.accessControl.grantRole(burnerRole, pool.address);
  for (const account of [
    token.address,
    pool.address,
    escrow.address,
    lane.bob.address,
    lane.carol.address,
    lane.defaultRecipient.address,
  ]) {
    await lane.accessControl.grantRole(greenlistedRole, account);
  }
  await lane.accessControl.grantRole(
    await escrow.FALLBACK_ESCROW_ADMIN_ROLE(),
    token.address,
  );

  return { lane, token, pool, escrow };
};

const seedStandaloneRecovery = async (params: {
  fixture: Awaited<ReturnType<typeof reentrantEscrowFixture>>;
  originalRecipient: string;
  amount?: BigNumberish;
}) => {
  const { fixture, originalRecipient, amount = 1 } = params;
  const { lane, token, pool, escrow } = fixture;
  await token.mint(escrow.address, amount);
  const poolSigner = await impersonate(pool.address);
  const recoveryEscrow = ccipEscrow(escrow.address, poolSigner);
  const nonce = await recoveryEscrow.recoveryCount();
  const recoveryId = expectedRecoveryId({
    chainId: (await ethers.provider.getNetwork()).chainId,
    escrow: escrow.address,
    nonce,
    originalSender: lane.alice.address,
    originalRecipient,
    sourceSelector: lane.a.selector,
    amount,
  });
  await recoveryEscrow.onFallbackMinted(
    lane.alice.address,
    originalRecipient,
    lane.a.selector,
    amount,
  );
  return recoveryId;
};

describe('Midas CCIP fallback escrow', () => {
  describe('initialization and administration', () => {
    it('initializes every trusted link and zero accounting field', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      expect(await escrow.accessControl()).eq(lane.accessControl.address);
      expect(await escrow.tokenPool()).eq(lane.b.pool.address);
      expect(await escrow.token()).eq(lane.b.token.address);
      expect(await escrow.defaultRecipient()).eq(lane.defaultRecipient.address);
      expect(await escrow.recoveryCount()).eq(0);
      expect(await escrow.pendingCount()).eq(0);
      expect(await escrow.totalReserved()).eq(0);
    });

    it('rejects each zero initialization dependency without partial initialization', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const valid = [
        lane.accessControl.address,
        lane.b.pool.address,
        lane.defaultRecipient.address,
      ];
      for (const index of [0, 1, 2]) {
        const escrow = await deployUninitializedEscrow();
        const args = [...valid];
        args[index] = constants.AddressZero;
        await expect(escrow.initialize(...args)).reverted;
        expect(await escrow.accessControl()).eq(constants.AddressZero);
      }
    });

    it('rejects an EOA or non-IPoolV2 contract as token pool', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const noTokenIdentity = await deploy('CCIPV2NoFallbackInterface');
      const invalidPools = [
        lane.unlisted.address,
        (await deploy('CCIPV2NoFallbackInterface')).address,
        (await deploy('CCIPV2PoolIdentityTester', lane.b.token.address, true))
          .address,
        (await deploy('CCIPV2PoolIdentityTester', constants.AddressZero, false))
          .address,
        (await deploy('CCIPV2PoolIdentityTester', lane.unlisted.address, false))
          .address,
        (
          await deploy(
            'CCIPV2PoolIdentityTester',
            noTokenIdentity.address,
            false,
          )
        ).address,
      ];
      for (const invalidPool of invalidPools) {
        const escrow = ccipEscrow(
          (await deployUninitializedEscrow()).address,
          lane.owner,
        );
        await expect(
          escrow.initialize(
            lane.accessControl.address,
            invalidPool,
            lane.defaultRecipient.address,
          ),
        )
          .revertedWithCustomError(escrow, 'InvalidPool')
          .withArgs(invalidPool);
      }
    });

    it('rejects a pool whose token uses another access-control instance', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const otherAccessControl = await deploy('MidasAccessControlTest');
      await otherAccessControl.initialize();
      const token = await deploy('mTokenPermissionedTest');
      await token.initialize(otherAccessControl.address);
      const pool = await deployPool({
        token: token.address,
        rmn: lane.b.rmn.address,
        router: lane.b.router.address,
      });
      const escrow = ccipEscrow(
        (await deployUninitializedEscrow()).address,
        lane.owner,
      );

      await expect(
        escrow.initialize(
          lane.accessControl.address,
          pool.address,
          lane.defaultRecipient.address,
        ),
      )
        .revertedWithCustomError(escrow, 'AccessControlMismatch')
        .withArgs(lane.accessControl.address, otherAccessControl.address);
    });

    it('cannot initialize an escrow proxy twice', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const before = await lane.b.escrow.defaultRecipient();
      await expect(
        lane.b.escrow.initialize(
          lane.accessControl.address,
          lane.b.pool.address,
          lane.carol.address,
        ),
      ).revertedWith('Initializable: contract is already initialized');
      expect(await lane.b.escrow.defaultRecipient()).eq(before);
    });

    it('reports IERC165 plus the narrow and management interface IDs', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const interfaces = await deploy('CCIPV2EscrowInterfaces');
      expect(await lane.b.escrow.supportsInterface('0x01ffc9a7')).eq(true);
      expect(
        await lane.b.escrow.supportsInterface(
          await interfaces.fallbackReceiverInterfaceId(),
        ),
      ).eq(true);
      expect(
        await lane.b.escrow.supportsInterface(
          await interfaces.fallbackEscrowInterfaceId(),
        ),
      ).eq(true);
      expect(await lane.b.escrow.supportsInterface('0xffffffff')).eq(false);
    });

    it('uses one shared escrow-admin role across escrow instances', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const second = await upgrades.deployProxy(
        await ethers.getContractFactory('MidasCCTFallbackEscrow'),
        [
          lane.accessControl.address,
          lane.a.pool.address,
          lane.defaultRecipient.address,
        ],
      );
      const role = await lane.b.escrow.FALLBACK_ESCROW_ADMIN_ROLE();
      expect(await second.FALLBACK_ESCROW_ADMIN_ROLE()).eq(role);
      expect(await lane.accessControl.hasRole(role, lane.owner.address)).eq(
        true,
      );
      expect(await lane.accessControl.hasRole(role, lane.unlisted.address)).eq(
        false,
      );
    });

    it('lets admin update the default recipient and emits both addresses', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(escrow.setDefaultRecipient(lane.carol.address))
        .to.emit(escrow, 'DefaultRecipientSet')
        .withArgs(lane.defaultRecipient.address, lane.carol.address);
      expect(await escrow.defaultRecipient()).eq(lane.carol.address);
    });

    it('prevents a non-admin from changing the default recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.alice);
      await expect(escrow.setDefaultRecipient(lane.carol.address))
        .revertedWithCustomError(escrow, 'NotEscrowAdmin')
        .withArgs(lane.alice.address);
      expect(await escrow.defaultRecipient()).eq(lane.defaultRecipient.address);
    });

    it('rejects zero, the escrow, and the pool as the default recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      for (const recipient of [
        constants.AddressZero,
        lane.b.escrow.address,
        lane.b.pool.address,
      ]) {
        await expect(escrow.setDefaultRecipient(recipient))
          .revertedWithCustomError(escrow, 'InvalidLocalRecipient')
          .withArgs(recipient);
      }
      expect(await escrow.defaultRecipient()).eq(lane.defaultRecipient.address);
    });

    it('adds and removes one peer escrow exactly', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(
        escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, true),
      )
        .to.emit(escrow, 'PeerEscrowSet')
        .withArgs(lane.a.selector, lane.a.escrow.address, true);
      expect(
        await escrow.isPeerEscrow(lane.a.selector, lane.a.escrow.address),
      ).eq(true);
      await escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, false);
      expect(
        await escrow.isPeerEscrow(lane.a.selector, lane.a.escrow.address),
      ).eq(false);
    });

    it('prevents a non-admin from changing peer provenance', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.alice);
      await expect(
        escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, true),
      )
        .revertedWithCustomError(escrow, 'NotEscrowAdmin')
        .withArgs(lane.alice.address);
    });

    it('rejects a zero peer escrow address', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(
        escrow.setPeerEscrow(lane.a.selector, constants.AddressZero, true),
      ).revertedWithCustomError(escrow, 'ZeroAddress');
      expect(
        await escrow.isPeerEscrow(lane.a.selector, constants.AddressZero),
      ).eq(false);
    });

    it('permits two peers during rotation until one is removed', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, true);
      await escrow.setPeerEscrow(lane.a.selector, lane.carol.address, true);
      expect(
        await escrow.isPeerEscrow(lane.a.selector, lane.a.escrow.address),
      ).eq(true);
      expect(await escrow.isPeerEscrow(lane.a.selector, lane.carol.address)).eq(
        true,
      );
      await escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, false);
      expect(
        await escrow.isPeerEscrow(lane.a.selector, lane.a.escrow.address),
      ).eq(false);
      expect(await escrow.isPeerEscrow(lane.a.selector, lane.carol.address)).eq(
        true,
      );
    });

    it('disables initialization on the implementation contract', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const implementation = await deploy('MidasCCTFallbackEscrow');
      await expect(
        implementation.initialize(
          lane.accessControl.address,
          lane.b.pool.address,
          lane.defaultRecipient.address,
        ),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('preserves populated recovery state when storage is appended', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const proxy = await upgrades.deployProxy(
        await ethers.getContractFactory('MidasCCTFallbackEscrow'),
        [
          lane.accessControl.address,
          lane.b.pool.address,
          lane.defaultRecipient.address,
        ],
      );
      await lane.accessControl.grantRole(lane.b.greenlistedRole, proxy.address);
      const replacementLane = { ...lane, b: { ...lane.b, escrow: proxy } };
      const { recoveryId } = await registerRecovery({
        lane: replacementLane,
        amount: 2,
      });
      const escrow = ccipEscrow(proxy.address, lane.owner);
      await escrow.setPeerEscrow(lane.a.selector, lane.a.escrow.address, true);
      const before = await readRecovery(proxy, recoveryId);
      const upgraded = await upgrades.upgradeProxy(
        proxy.address,
        await ethers.getContractFactory('MidasCCTFallbackEscrowUpgradeTester'),
      );
      await upgraded.setUpgradeMarker(42);

      expect(await upgraded.upgradeMarker()).eq(42);
      expect(await readRecovery(upgraded, recoveryId)).deep.eq(before);
      expect(
        await ccipEscrow(upgraded.address, lane.owner).isPeerEscrow(
          lane.a.selector,
          lane.a.escrow.address,
        ),
      ).eq(true);
    });

    it('accepts appended storage and rejects an incompatible layout', async () => {
      const current = await ethers.getContractFactory('MidasCCTFallbackEscrow');
      await expect(
        upgrades.validateUpgrade(
          current,
          await ethers.getContractFactory(
            'MidasCCTFallbackEscrowUpgradeTester',
          ),
        ),
      ).not.rejected;
      await expect(
        upgrades.validateUpgrade(
          current,
          await ethers.getContractFactory(
            'MidasCCTFallbackEscrowIncompatibleTester',
          ),
        ),
      ).rejected;
    });
  });

  describe('recovery registration', () => {
    it('accepts registration only from the configured pool', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.alice);
      await expect(
        escrow.onFallbackMinted(
          lane.alice.address,
          lane.bob.address,
          lane.a.selector,
          1,
        ),
      )
        .revertedWithCustomError(escrow, 'NotTokenPool')
        .withArgs(lane.alice.address);
    });

    it('atomically registers one exactly funded Pending recovery', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 2;
      const recoveryId = await expectedId(lane, 0, lane.bob.address, amount);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      const { transaction } = await registerRecovery({ lane, amount });
      await expect(transaction)
        .to.emit(escrow, 'RecoveryRegistered')
        .withArgs(
          recoveryId,
          lane.alice.address,
          lane.bob.address,
          lane.a.selector,
          amount,
          true,
        );
      const record = await readRecovery(lane.b.escrow, recoveryId);
      expect(record.status).eq(RecoveryStatus.Pending);
      expect(record.amount).eq(amount);
      expect(await escrow.recoveryCount()).eq(1);
      expect(await escrow.pendingCount()).eq(1);
      expect(await escrow.totalReserved()).eq(amount);
      expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(amount);
    });

    it('gives identical recovery fields distinct nonce-derived IDs', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await registerRecovery({ lane, amount: 1 });
      const second = await registerRecovery({ lane, amount: 1 });
      expect(first.recoveryId).not.eq(second.recoveryId);
      expect(first.recoveryId).eq(
        await expectedId(lane, 0, lane.bob.address, 1),
      );
      expect(second.recoveryId).eq(
        await expectedId(lane, 1, lane.bob.address, 1),
      );
      expect(
        await ccipEscrow(lane.b.escrow.address, lane.owner).totalReserved(),
      ).eq(2);
    });

    it('uses the documented domain, chain, escrow, nonce, and fields', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const expected = await expectedId(lane, 0, lane.bob.address, 7);
      expect((await registerRecovery({ lane, amount: 7 })).recoveryId).eq(
        expected,
      );
      expect((await readRecovery(lane.b.escrow, expected)).amount).eq(7);
    });

    it('rejects a zero original sender without creating a liability', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(
        lane.b.escrow.address,
        await impersonate(lane.b.pool.address),
      );
      await lane.b.token.mint(lane.b.escrow.address, 1);
      await expect(
        escrow.onFallbackMinted(
          constants.AddressZero,
          lane.bob.address,
          lane.a.selector,
          1,
        ),
      )
        .revertedWithCustomError(escrow, 'InvalidOriginalSender')
        .withArgs(constants.AddressZero);
      expect(
        await ccipEscrow(lane.b.escrow.address, lane.owner).pendingCount(),
      ).eq(0);
    });

    it('rejects a zero recovery amount', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(
        lane.b.escrow.address,
        await impersonate(lane.b.pool.address),
      );
      await expect(
        escrow.onFallbackMinted(
          lane.alice.address,
          lane.bob.address,
          lane.a.selector,
          0,
        ),
      )
        .revertedWithCustomError(escrow, 'InvalidAmount')
        .withArgs(0);
    });

    it('refuses an unfunded callback', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(
        lane.b.escrow.address,
        await impersonate(lane.b.pool.address),
      );
      await expect(
        escrow.onFallbackMinted(
          lane.alice.address,
          lane.bob.address,
          lane.a.selector,
          2,
        ),
      )
        .revertedWithCustomError(escrow, 'InsufficientEscrowFunding')
        .withArgs(0, 2);
    });

    it('preserves zero and system destination recipients as historical input', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recipients = [
        constants.AddressZero,
        lane.b.escrow.address,
        lane.b.pool.address,
      ];
      for (const recipient of recipients) {
        const { recoveryId } = await registerRecovery({
          lane,
          originalRecipient: recipient,
        });
        const record = await readRecovery(lane.b.escrow, recoveryId);
        expect(record.originalRecipient).eq(recipient);
        expect(record.status).eq(RecoveryStatus.Pending);
      }
    });

    it('marks an ordinary source sender returnable', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const { recoveryId } = await registerRecovery({ lane });
      expect((await readRecovery(lane.b.escrow, recoveryId)).returnable).eq(
        true,
      );
    });

    it('marks a configured peer-escrow sender non-returnable', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await escrow.setPeerEscrow(lane.a.selector, lane.alice.address, true);
      const { recoveryId } = await registerRecovery({ lane });
      expect((await readRecovery(lane.b.escrow, recoveryId)).returnable).eq(
        false,
      );
    });

    it('treats a direct token donation as surplus, not a record', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await lane.b.token.mint(lane.b.escrow.address, 5);
      expect(await escrow.recoveryCount()).eq(0);
      expect(await escrow.pendingCount()).eq(0);
      expect(await escrow.totalReserved()).eq(0);
      expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(5);
    });

    it('exposes None for an unknown ID and cannot consume it', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const unknown = ethers.utils.keccak256('0x1234');
      const record = await readRecovery(lane.b.escrow, unknown);
      expect(record.status).eq(RecoveryStatus.None);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.alice);
      await expect(escrow.claim(unknown, lane.alice.address))
        .revertedWithCustomError(escrow, 'RecoveryNotPending')
        .withArgs(unknown, RecoveryStatus.None);
    });

    it('emits every field required to reconstruct a registration', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 9;
      const expected = await expectedId(lane, 0, lane.bob.address, amount);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect((await registerRecovery({ lane, amount })).transaction)
        .to.emit(escrow, 'RecoveryRegistered')
        .withArgs(
          expected,
          lane.alice.address,
          lane.bob.address,
          lane.a.selector,
          amount,
          true,
        );
    });

    it('exposes no synthetic orphan-registration selector', async () => {
      const factory = await ethers.getContractFactory('MidasCCTFallbackEscrow');
      expect(
        factory.interface.functions[
          'registerOrphanedBulk((address,uint256,uint64)[])'
        ],
      ).eq(undefined);
      expect(
        factory.interface.functions['onFailedMessage(address,uint256,uint64)'],
      ).eq(undefined);
    });
  });

  describe('self-service local claim', () => {
    it('lets an eligible original recipient claim locally to itself', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      const before = await lane.b.token.balanceOf(lane.bob.address);
      await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        recoveryId,
        lane.bob.address,
      );
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(before.add(2));
      expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
        RecoveryStatus.Claimed,
      );
      expect((await readEscrowAccounting(lane.b.escrow)).pending).eq(0);
    });

    it('lets an eligible original recipient redirect a local claim', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      const before = await lane.b.token.balanceOf(lane.carol.address);
      await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        recoveryId,
        lane.carol.address,
      );
      expect(await lane.b.token.balanceOf(lane.carol.address)).eq(
        before.add(2),
      );
      expect((await readEscrowAccounting(lane.b.escrow)).reserve).eq(0);
    });

    it('lets a non-blacklisted original recipient choose an eligible recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.bob.address,
      );
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).not.reverted;
    });

    it('prevents a blacklisted original recipient from claiming locally', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      const second = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const firstBefore = await claimSnapshot(lane, first);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          first,
          lane.bob.address,
        ),
      ).reverted;
      expect(await claimSnapshot(lane, first)).deep.eq(firstBefore);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          second,
          lane.carol.address,
        ),
      ).reverted;
    });

    it('reserves local claims for the original recipient even when another caller is admin', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      const second = await seedRecovery({ lane });
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.alice).claim(
          first,
          lane.carol.address,
        ),
      ).reverted;
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.owner).claim(
          second,
          lane.carol.address,
        ),
      ).reverted;
    });

    it('rejects an unknown recovery without changing accounting', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const unknown = ethers.utils.keccak256('0xabcd');
      const before = await readEscrowAccounting(lane.b.escrow);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          unknown,
          lane.bob.address,
        ),
      ).reverted;
      expect(await readEscrowAccounting(lane.b.escrow)).deep.eq(before);
    });

    it('rejects a second claim from every terminal status', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const claimed = await seedRecovery({ lane });
      await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        claimed,
        lane.bob.address,
      );
      const adminRecovered = await seedRecovery({ lane });
      const confiscated = await seedRecovery({ lane });
      const returned = await seedRecovery({ lane });
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await escrow.adminRecoverBulk([
        { recoveryId: adminRecovered, recipient: lane.carol.address },
      ]);
      await escrow.confiscateBulk([confiscated]);
      const fee = await escrow.getReturnToSourceFee(returned);
      await escrow.returnToSource(returned, { value: fee });

      for (const recoveryId of [
        claimed,
        adminRecovered,
        confiscated,
        returned,
      ]) {
        await expect(
          ccipEscrow(lane.b.escrow.address, lane.bob).claim(
            recoveryId,
            lane.bob.address,
          ),
        ).revertedWithCustomError(escrow, 'RecoveryNotPending');
      }
    });

    it('rejects zero, escrow, and pool addresses as local claim recipients', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recipients = [
        constants.AddressZero,
        lane.b.escrow.address,
        lane.b.pool.address,
      ];
      const ids = await Promise.all(
        recipients.map(() => seedRecovery({ lane })),
      );
      const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
      for (let index = 0; index < recipients.length; ++index) {
        await expect(escrow.claim(ids[index], recipients[index]))
          .revertedWithCustomError(escrow, 'InvalidLocalRecipient')
          .withArgs(recipients[index]);
      }
    });

    it('rolls back when the selected recipient is blacklisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.carol.address,
      );
      const before = await claimSnapshot(lane, recoveryId);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).reverted;
      expect(await claimSnapshot(lane, recoveryId)).deep.eq(before);
    });

    it('rolls back when the selected recipient is not greenlisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.carol.address,
      );
      const before = await claimSnapshot(lane, recoveryId);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).reverted;
      expect(await claimSnapshot(lane, recoveryId)).deep.eq(before);
    });

    it('rolls back when the token is paused before claim', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE(),
        lane.owner.address,
      );
      await lane.b.token.pause();
      const before = await claimSnapshot(lane, recoveryId);
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).reverted;
      expect(await claimSnapshot(lane, recoveryId)).deep.eq(before);
    });

    it('permits local claim for a non-returnable peer-origin record', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await escrow.setPeerEscrow(lane.a.selector, lane.alice.address, true);
      const { recoveryId } = await registerRecovery({ lane });
      expect((await readRecovery(lane.b.escrow, recoveryId)).returnable).eq(
        false,
      );
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).not.reverted;
    });

    it('blocks preferential withdrawal while globally insolvent', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      await seedRecovery({ lane });
      await lane.accessControl.grantRole(lane.b.burnerRole, lane.owner.address);
      await lane.b.token.burnGoverned(lane.b.escrow.address, 1);
      const before = await claimSnapshot(lane, first);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.bob);
      await expect(escrow.claim(first, lane.bob.address))
        .revertedWithCustomError(escrow, 'EscrowInsolvent')
        .withArgs(1, 2);
      expect(await claimSnapshot(lane, first)).deep.eq(before);
    });

    it('leaves unrelated surplus after an exact claim', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      await lane.b.token.mint(lane.b.escrow.address, 7);
      await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        recoveryId,
        lane.carol.address,
      );
      expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(7);
      expect((await readEscrowAccounting(lane.b.escrow)).reserve).eq(0);
    });

    it('blocks a token hook from claiming a second pending record', async () => {
      // This specialized fixture is deliberately uncached. Caching it beside
      // ccipV2LaneFixture creates sibling EVM snapshots; restoring the shared
      // lane snapshot invalidates the specialized snapshot for later tests.
      const fixture = await reentrantEscrowFixture();
      const { lane, token, escrow } = fixture;
      const first = await seedStandaloneRecovery({
        fixture,
        originalRecipient: token.address,
      });
      const second = await seedStandaloneRecovery({
        fixture,
        originalRecipient: token.address,
      });
      const recoveryEscrow = ccipEscrow(escrow.address, lane.owner);
      const inner = recoveryEscrow.interface.encodeFunctionData('claim', [
        second,
        lane.carol.address,
      ]);
      const outer = recoveryEscrow.interface.encodeFunctionData('claim', [
        first,
        lane.carol.address,
      ]);
      await token.configureHook(escrow.address, inner, true);
      const before = await token.balanceOf(lane.carol.address);

      await token.callTarget(escrow.address, outer);
      expect(await token.hookAttempts()).eq(1);
      expect(await token.hookSucceeded()).eq(false);
      expect((await readRecovery(escrow, first)).status).eq(
        RecoveryStatus.Claimed,
      );
      expect((await readRecovery(escrow, second)).status).eq(
        RecoveryStatus.Pending,
      );
      expect(await token.balanceOf(lane.carol.address)).eq(before.add(1));
      expect(await token.balanceOf(escrow.address)).eq(1);
    });

    it('has no expiry even after one hundred years', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await time.increase(100 * 365 * 24 * 60 * 60);
      expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
        RecoveryStatus.Pending,
      );
      await expect(
        ccipEscrow(lane.b.escrow.address, lane.bob).claim(
          recoveryId,
          lane.carol.address,
        ),
      ).not.reverted;
    });
  });

  describe('admin local recovery', () => {
    it('recovers one record to its eligible original recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      const before = await lane.b.token.balanceOf(lane.bob.address);
      const transaction = await adminRecoverOriginalRecipients(
        lane,
        lane.owner,
        [recoveryId],
      );
      await transaction.wait();

      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(before.add(2));
      expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
        RecoveryStatus.AdminRecovered,
      );
      await expect(transaction)
        .emit(
          ccipEscrow(lane.b.escrow.address, lane.owner),
          'RecoveryAdminRecovered',
        )
        .withArgs(
          recoveryId,
          lane.owner.address,
          lane.bob.address,
          lane.bob.address,
          2,
        );
    });

    it('lets admin redirect a blacklisted-recipient recovery to an eligible recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const before = await lane.b.token.balanceOf(lane.carol.address);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);

      await expect(
        escrow.adminRecoverBulk([
          { recoveryId, recipient: lane.carol.address },
        ]),
      )
        .emit(escrow, 'RecoveryAdminRecovered')
        .withArgs(
          recoveryId,
          lane.owner.address,
          lane.carol.address,
          lane.bob.address,
          2,
        );
      expect(await lane.b.token.balanceOf(lane.carol.address)).eq(
        before.add(2),
      );
    });

    it('preserves Pending when admin selects a still-blacklisted recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const before = await batchSnapshot(lane, [recoveryId]);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.owner, [recoveryId]),
      ).reverted;
      expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
    });

    it('rejects non-admin before processing', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      const before = await batchSnapshot(lane, [recoveryId]);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.unlisted, [recoveryId]),
      ).reverted;
      expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
    });

    it('rejects an empty admin-recovery batch', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.owner, []),
      ).revertedWithCustomError(escrow, 'EmptyBatch');
    });

    it('atomically recovers multiple records to explicit recipients', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane, amount: 2 });
      const second = await seedRecovery({ lane, amount: 3 });
      const beforeBob = await lane.b.token.balanceOf(lane.bob.address);
      const beforeCarol = await lane.b.token.balanceOf(lane.carol.address);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);

      const transaction = await escrow.adminRecoverBulk([
        { recoveryId: first, recipient: lane.bob.address },
        { recoveryId: second, recipient: lane.carol.address },
      ]);
      const receipt = await transaction.wait();
      const topic = escrow.interface.getEventTopic('RecoveryAdminRecovered');
      expect(
        receipt.logs.filter(
          (log) =>
            log.address.toLowerCase() === escrow.address.toLowerCase() &&
            log.topics[0] === topic,
        ),
      ).length(2);
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(
        beforeBob.add(2),
      );
      expect(await lane.b.token.balanceOf(lane.carol.address)).eq(
        beforeCarol.add(3),
      );
      expect((await readEscrowAccounting(lane.b.escrow)).reserve).eq(0);
    });

    it('rolls back the entire batch when an ID is duplicated', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      const before = await batchSnapshot(lane, [recoveryId]);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.owner, [
          recoveryId,
          recoveryId,
        ]),
      ).reverted;
      expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
    });

    it('rolls back the entire batch when one ID is terminal', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pending = await seedRecovery({ lane });
      const terminal = await seedRecovery({ lane });
      await ccipEscrow(lane.b.escrow.address, lane.bob).claim(
        terminal,
        lane.bob.address,
      );
      const before = await batchSnapshot(lane, [pending, terminal]);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.owner, [pending, terminal]),
      ).reverted;
      expect(await batchSnapshot(lane, [pending, terminal])).deep.eq(before);
    });

    it('rejects zero, escrow, or pool as explicit admin recipients', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recipients = [
        constants.AddressZero,
        lane.b.escrow.address,
        lane.b.pool.address,
      ];
      const ids = await Promise.all(
        recipients.map(() => seedRecovery({ lane })),
      );
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);

      for (let index = 0; index < recipients.length; ++index) {
        const before = await batchSnapshot(lane, [ids[index]]);
        await expect(
          escrow.adminRecoverBulk([
            { recoveryId: ids[index], recipient: recipients[index] },
          ]),
        )
          .revertedWithCustomError(escrow, 'InvalidLocalRecipient')
          .withArgs(recipients[index]);
        expect(await batchSnapshot(lane, [ids[index]])).deep.eq(before);
      }
    });

    it('rolls back earlier items when a later token transfer fails', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({
        lane,
        originalRecipient: lane.carol.address,
      });
      const second = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const before = await batchSnapshot(lane, [first, second]);
      await expect(
        adminRecoverOriginalRecipients(lane, lane.owner, [first, second]),
      ).reverted;
      expect(await batchSnapshot(lane, [first, second])).deep.eq(before);
    });

    it('processes a generated batch within the current block gas budget', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      const block = await ethers.provider.getBlock('latest');
      const singleGas = await ccipEscrow(
        lane.b.escrow.address,
        lane.owner,
      ).estimateGas.adminRecoverBulk([
        { recoveryId: first, recipient: lane.bob.address },
      ]);
      const recordCount = Math.max(
        2,
        block.gasLimit.div(100).div(singleGas).toNumber(),
      );
      const ids = [first];
      while (ids.length < recordCount) {
        ids.push(await seedRecovery({ lane }));
      }

      await expect(adminRecoverOriginalRecipients(lane, lane.owner, ids)).not
        .reverted;
      for (const recoveryId of ids) {
        expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
          RecoveryStatus.AdminRecovered,
        );
      }
    });

    it('blocks preferential admin recovery while globally insolvent', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      await seedRecovery({ lane });
      await lane.accessControl.grantRole(lane.b.burnerRole, lane.owner.address);
      await lane.b.token.burnGoverned(lane.b.escrow.address, 1);
      const before = await batchSnapshot(lane, [first]);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(adminRecoverOriginalRecipients(lane, lane.owner, [first]))
        .revertedWithCustomError(escrow, 'EscrowInsolvent')
        .withArgs(1, 2);
      expect(await batchSnapshot(lane, [first])).deep.eq(before);
    });

    it('blocks a token hook from admin-recovering a second record', async () => {
      const fixture = await reentrantEscrowFixture();
      const { lane, token, escrow } = fixture;
      const first = await seedStandaloneRecovery({
        fixture,
        originalRecipient: lane.carol.address,
      });
      const second = await seedStandaloneRecovery({
        fixture,
        originalRecipient: lane.carol.address,
      });
      const recoveryEscrow = ccipEscrow(escrow.address, lane.owner);
      const outer = recoveryEscrow.interface.encodeFunctionData(
        'adminRecoverBulk',
        [[{ recoveryId: first, recipient: lane.carol.address }]],
      );
      const inner = recoveryEscrow.interface.encodeFunctionData(
        'adminRecoverBulk',
        [[{ recoveryId: second, recipient: lane.carol.address }]],
      );
      await token.configureHook(escrow.address, inner, true);
      const before = await token.balanceOf(lane.carol.address);

      await token.callTarget(escrow.address, outer);
      expect(await token.hookAttempts()).eq(1);
      expect(await token.hookSucceeded()).eq(false);
      expect((await readRecovery(escrow, first)).status).eq(
        RecoveryStatus.AdminRecovered,
      );
      expect((await readRecovery(escrow, second)).status).eq(
        RecoveryStatus.Pending,
      );
      expect(await token.balanceOf(lane.carol.address)).eq(before.add(1));
      expect(await token.balanceOf(escrow.address)).eq(1);
    });
  });

  describe('confiscation', () => {
    it('confiscates one record to the current default recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      const before = await lane.b.token.balanceOf(
        lane.defaultRecipient.address,
      );
      const transaction = await confiscateRecoveries(lane, lane.owner, [
        recoveryId,
      ]);
      await transaction.wait();

      expect(await lane.b.token.balanceOf(lane.defaultRecipient.address)).eq(
        before.add(2),
      );
      expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
        RecoveryStatus.Confiscated,
      );
      await expect(transaction)
        .emit(
          ccipEscrow(lane.b.escrow.address, lane.owner),
          'RecoveryConfiscated',
        )
        .withArgs(
          recoveryId,
          lane.owner.address,
          lane.defaultRecipient.address,
          2,
        );
    });

    it('permits confiscation while the original recipient is blacklisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      await expect(confiscateRecoveries(lane, lane.owner, [recoveryId])).not
        .reverted;
      expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
        RecoveryStatus.Confiscated,
      );
    });

    it('sends funds to the default recipient selected after registration', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane, amount: 2 });
      await lane.b.escrow.setDefaultRecipient(lane.carol.address);
      const before = await lane.b.token.balanceOf(lane.carol.address);
      await confiscateRecoveries(lane, lane.owner, [recoveryId]);
      expect(await lane.b.token.balanceOf(lane.carol.address)).eq(
        before.add(2),
      );
    });

    it('preserves Pending when the current default recipient fails token policy', async () => {
      const run = async (mutate: (lane: Lane) => Promise<unknown>) => {
        const lane = await loadFixture(ccipV2LaneFixture);
        const recoveryId = await seedRecovery({ lane });
        await mutate(lane);
        const before = await batchSnapshot(lane, [recoveryId]);
        await expect(confiscateRecoveries(lane, lane.owner, [recoveryId]))
          .reverted;
        expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
      };

      await run((lane) =>
        lane.accessControl.grantRole(
          lane.b.token.BLACKLISTED_ROLE(),
          lane.defaultRecipient.address,
        ),
      );
      await run((lane) =>
        lane.accessControl.revokeRole(
          lane.b.greenlistedRole,
          lane.defaultRecipient.address,
        ),
      );
      await run(async (lane) => {
        await lane.accessControl.grantRole(
          await lane.b.token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE(),
          lane.owner.address,
        );
        return lane.b.token.pause();
      });
    });

    it('rejects confiscation by a non-admin', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      const before = await batchSnapshot(lane, [recoveryId]);
      await expect(confiscateRecoveries(lane, lane.unlisted, [recoveryId]))
        .reverted;
      expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
    });

    it('rejects an empty confiscation batch', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      await expect(
        confiscateRecoveries(lane, lane.owner, []),
      ).revertedWithCustomError(escrow, 'EmptyBatch');
    });

    it('atomically confiscates a valid multi-record batch', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const ids = [
        await seedRecovery({ lane, amount: 2 }),
        await seedRecovery({ lane, amount: 3 }),
        await seedRecovery({ lane, amount: 5 }),
      ];
      const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
      const transaction = await confiscateRecoveries(lane, lane.owner, ids);
      const receipt = await transaction.wait();
      const topic = escrow.interface.getEventTopic('RecoveryConfiscated');
      expect(
        receipt.logs.filter(
          (log) =>
            log.address.toLowerCase() === escrow.address.toLowerCase() &&
            log.topics[0] === topic,
        ),
      ).length(3);
      expect((await readEscrowAccounting(lane.b.escrow)).reserve).eq(0);
    });

    it('rolls back the batch when an ID is duplicated', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const recoveryId = await seedRecovery({ lane });
      const before = await batchSnapshot(lane, [recoveryId]);
      await expect(
        confiscateRecoveries(lane, lane.owner, [recoveryId, recoveryId]),
      ).reverted;
      expect(await batchSnapshot(lane, [recoveryId])).deep.eq(before);
    });

    it('processes a generated batch within the current block gas budget', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const first = await seedRecovery({ lane });
      const block = await ethers.provider.getBlock('latest');
      const singleGas = await ccipEscrow(
        lane.b.escrow.address,
        lane.owner,
      ).estimateGas.confiscateBulk([first]);
      const recordCount = Math.max(
        2,
        block.gasLimit.div(100).div(singleGas).toNumber(),
      );
      const ids = [first];
      while (ids.length < recordCount) {
        ids.push(await seedRecovery({ lane }));
      }

      await expect(confiscateRecoveries(lane, lane.owner, ids)).not.reverted;
      for (const recoveryId of ids) {
        expect((await readRecovery(lane.b.escrow, recoveryId)).status).eq(
          RecoveryStatus.Confiscated,
        );
      }
    });

    it('removes the ambiguous closeBulk selector', async () => {
      const factory = await ethers.getContractFactory('MidasCCTFallbackEscrow');
      expect(factory.interface.functions['closeBulk(bytes32[])']).eq(undefined);
    });

    it('blocks a token hook from confiscating a second record', async () => {
      const fixture = await reentrantEscrowFixture();
      const { lane, token, escrow } = fixture;
      const first = await seedStandaloneRecovery({
        fixture,
        originalRecipient: lane.bob.address,
      });
      const second = await seedStandaloneRecovery({
        fixture,
        originalRecipient: lane.bob.address,
      });
      const recoveryEscrow = ccipEscrow(escrow.address, lane.owner);
      const outer = recoveryEscrow.interface.encodeFunctionData(
        'confiscateBulk',
        [[first]],
      );
      const inner = recoveryEscrow.interface.encodeFunctionData(
        'confiscateBulk',
        [[second]],
      );
      await token.configureHook(escrow.address, inner, true);
      const defaultBefore = await token.balanceOf(
        lane.defaultRecipient.address,
      );

      await token.callTarget(escrow.address, outer);
      expect(await token.hookAttempts()).eq(1);
      expect(await token.hookSucceeded()).eq(false);
      expect((await readRecovery(escrow, first)).status).eq(
        RecoveryStatus.Confiscated,
      );
      expect((await readRecovery(escrow, second)).status).eq(
        RecoveryStatus.Pending,
      );
      expect(await token.balanceOf(lane.defaultRecipient.address)).eq(
        defaultBefore.add(1),
      );
      expect(await token.balanceOf(escrow.address)).eq(1);
    });
  });
});
