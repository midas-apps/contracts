import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import {
  days,
  hours,
  minutes,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  RateLimitLibraryTester,
  RateLimitLibraryTester__factory,
} from '../../typechain-types';
import { getCurrentBlockTimestamp } from '../common/common.helpers';
import {
  calculateWindowRateLimitCapacity,
  mulDiv,
} from '../common/manageable-vault.helpers';

type WindowStatus = Awaited<
  ReturnType<RateLimitLibraryTester['getWindowStatusesPublic']>
>[number];

describe('RateLimitLibrary', function () {
  const WINDOW_1D = days(1);
  const WINDOW_2D = days(2);
  const MIN_WINDOW = 60;

  const rateLimitLibraryFixture = async () => {
    const [signer] = await ethers.getSigners();
    const tester = await new RateLimitLibraryTester__factory(signer).deploy();
    return { tester, signer };
  };

  const getStatusByWindow = (
    statuses: WindowStatus[],
    window: BigNumberish,
  ): WindowStatus | undefined => statuses.find((s) => s.window.eq(window));

  const findOneWeiMulDivSplitGap = (
    limit: BigNumberish,
    window: number,
  ): { leftElapsed: number; rightElapsed: number } => {
    for (let leftElapsed = 1; leftElapsed < window; leftElapsed++) {
      for (
        let rightElapsed = 1;
        leftElapsed + rightElapsed < window;
        rightElapsed++
      ) {
        const singleDecay = mulDiv(limit, leftElapsed + rightElapsed, window);
        const splitDecay = mulDiv(limit, leftElapsed, window).add(
          mulDiv(limit, rightElapsed, window),
        );
        if (singleDecay.sub(splitDecay).eq(1)) {
          return { leftElapsed, rightElapsed };
        }
      }
    }

    throw new Error('Failed to find 1 wei mulDiv split gap');
  };

  const expectStatusMatchesCapacity = async (
    tester: RateLimitLibraryTester,
    window: BigNumberish,
    storedAmountInFlight: BigNumberish,
    limit: BigNumberish,
    windowDuration: BigNumberish,
    lastUpdated: BigNumberish,
  ) => {
    const now = await getCurrentBlockTimestamp();
    const { inFlight, remaining } = calculateWindowRateLimitCapacity({
      amountInFlight: storedAmountInFlight,
      lastUpdated,
      limit,
      window: windowDuration,
      now,
    });

    const statuses = await tester.getWindowStatusesPublic();
    const status = getStatusByWindow(statuses, window);

    expect(status).not.eq(undefined);
    expect(status!.inFlight).eq(inFlight);
    expect(status!.remaining).eq(remaining);
    expect(status!.limit).eq(limit);
    expect(status!.window).eq(windowDuration);
    expect(status!.lastUpdated).eq(lastUpdated);
  };

  describe('setWindowLimit()', () => {
    it('should add a new window, emit WindowLimitSet and return previousLimit 0', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await expect(tester.setWindowLimitPublic(WINDOW_1D, limit))
        .to.emit(tester, 'WindowLimitSet')
        .withArgs(WINDOW_1D, limit);

      expect(await tester.windowCountPublic()).eq(1);
      expect(await tester.hasWindowPublic(WINDOW_1D)).eq(true);
    });

    it('should initialize storage with full remaining capacity', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);

      const [storedLimit, amountInFlight, lastUpdated, windowDuration] =
        await tester.getWindowConfigPublic(WINDOW_1D);

      expect(storedLimit).eq(limit);
      expect(amountInFlight).eq(0);
      expect(windowDuration).eq(WINDOW_1D);
      expect(lastUpdated).eq(await getCurrentBlockTimestamp());

      const statuses = await tester.getWindowStatusesPublic();
      const status = getStatusByWindow(statuses, WINDOW_1D);

      expect(status!.inFlight).eq(0);
      expect(status!.remaining).eq(limit);
    });

    it('should allow limit 0', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, 0);

      const statuses = await tester.getWindowStatusesPublic();
      expect(getStatusByWindow(statuses, WINDOW_1D)!.remaining).eq(0);
    });

    it('should fail: window shorter than 1 minute', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await expect(tester.setWindowLimitPublic(MIN_WINDOW - 1, 1))
        .to.be.revertedWithCustomError(tester, 'WindowTooShort')
        .withArgs(MIN_WINDOW - 1);
    });

    it('should allow window exactly 1 minute', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await expect(tester.setWindowLimitPublic(MIN_WINDOW, 1)).not.reverted;
      expect(await tester.hasWindowPublic(MIN_WINDOW)).eq(true);
    });

    it('should return previous limit when updating an existing window', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const initialLimit = parseUnits('1000');
      const newLimit = parseUnits('500');

      await tester.setWindowLimitPublic(WINDOW_1D, initialLimit);

      await expect(tester.setWindowLimitPublic(WINDOW_1D, newLimit))
        .to.emit(tester, 'WindowLimitSet')
        .withArgs(WINDOW_1D, newLimit);

      const previousLimit = await tester.callStatic.setWindowLimitPublic(
        WINDOW_1D,
        newLimit,
      );
      expect(previousLimit).eq(newLimit);

      const [, , , windowDuration] = await tester.getWindowConfigPublic(
        WINDOW_1D,
      );
      expect(windowDuration).eq(WINDOW_1D);

      const statuses = await tester.getWindowStatusesPublic();
      expect(getStatusByWindow(statuses, WINDOW_1D)!.limit).eq(newLimit);
    });

    it('should checkpoint stored in-flight using the new limit on update', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const initialLimit = parseUnits('1000');
      const newLimit = parseUnits('500');
      const consumed = parseUnits('800');

      await tester.setWindowLimitPublic(WINDOW_1D, initialLimit);
      await tester.consumeLimitPublic(consumed);

      const [, , lastUpdatedAfterConsume] = await tester.getWindowConfigPublic(
        WINDOW_1D,
      );
      await time.increase(hours(12));

      await tester.setWindowLimitPublic(WINDOW_1D, newLimit);

      const [, amountInFlight, lastUpdatedAfterSet] =
        await tester.getWindowConfigPublic(WINDOW_1D);

      const { inFlight: expectedStored } = calculateWindowRateLimitCapacity({
        amountInFlight: consumed,
        lastUpdated: lastUpdatedAfterConsume,
        limit: newLimit,
        window: WINDOW_1D,
        now: lastUpdatedAfterSet,
      });

      expect(amountInFlight).eq(expectedStored);
      expect(lastUpdatedAfterSet).eq(await getCurrentBlockTimestamp());

      const statuses = await tester.getWindowStatusesPublic();
      const status = getStatusByWindow(statuses, WINDOW_1D);

      expect(status!.limit).eq(newLimit);
      expect(status!.inFlight).eq(expectedStored);
      expect(status!.remaining).eq(
        newLimit.lte(expectedStored) ? 0 : newLimit.sub(expectedStored),
      );
    });

    it('should support multiple independent windows', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.setWindowLimitPublic(WINDOW_2D, parseUnits('2000'));

      expect(await tester.windowCountPublic()).eq(2);

      const statuses = await tester.getWindowStatusesPublic();
      expect(statuses.length).eq(2);
      expect(getStatusByWindow(statuses, WINDOW_1D)!.limit).eq(
        parseUnits('1000'),
      );
      expect(getStatusByWindow(statuses, WINDOW_2D)!.limit).eq(
        parseUnits('2000'),
      );
    });
  });

  describe('removeWindowLimit()', () => {
    it('should remove an existing window and emit WindowLimitRemoved', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));

      await expect(tester.removeWindowLimitPublic(WINDOW_1D))
        .to.emit(tester, 'WindowLimitRemoved')
        .withArgs(WINDOW_1D);

      expect(await tester.windowCountPublic()).eq(0);
      expect(await tester.hasWindowPublic(WINDOW_1D)).eq(false);
      expect((await tester.getWindowStatusesPublic()).length).eq(0);
    });

    it('should fail: unknown window', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await expect(tester.removeWindowLimitPublic(WINDOW_1D))
        .to.be.revertedWithCustomError(tester, 'UnknownWindowLimit')
        .withArgs(WINDOW_1D);
    });

    it('should fail: removing the same window twice', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.removeWindowLimitPublic(WINDOW_1D);

      await expect(tester.removeWindowLimitPublic(WINDOW_1D))
        .to.be.revertedWithCustomError(tester, 'UnknownWindowLimit')
        .withArgs(WINDOW_1D);
    });

    it('should not affect other windows', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.setWindowLimitPublic(WINDOW_2D, parseUnits('2000'));

      await tester.removeWindowLimitPublic(WINDOW_1D);

      expect(await tester.windowCountPublic()).eq(1);
      expect(await tester.hasWindowPublic(WINDOW_2D)).eq(true);

      const statuses = await tester.getWindowStatusesPublic();
      expect(statuses.length).eq(1);
      expect(statuses[0].window).eq(WINDOW_2D);
    });
  });

  describe('consumeLimit()', () => {
    it('should consume amount and update stored in-flight', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');
      const amount = parseUnits('300');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(amount);

      const [, amountInFlight, lastUpdated] =
        await tester.getWindowConfigPublic(WINDOW_1D);

      expect(amountInFlight).eq(amount);
      expect(lastUpdated).eq(await getCurrentBlockTimestamp());

      const statuses = await tester.getWindowStatusesPublic();
      const status = getStatusByWindow(statuses, WINDOW_1D);

      expect(status!.inFlight).eq(amount);
      expect(status!.remaining).eq(limit.sub(amount));
    });

    it('should allow consuming the full limit', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(limit);

      const statuses = await tester.getWindowStatusesPublic();
      expect(getStatusByWindow(statuses, WINDOW_1D)!.remaining).eq(0);
      expect(getStatusByWindow(statuses, WINDOW_1D)!.inFlight).eq(limit);
    });

    it('should fail: amount exceeds remaining', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(parseUnits('800'));

      await expect(
        tester.consumeLimitPublic(parseUnits('500')),
      ).to.be.revertedWithCustomError(tester, 'WindowLimitExceeded');
    });

    it('should fail: any positive consume when limit is 0', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, 0);

      await expect(tester.consumeLimitPublic(1))
        .to.be.revertedWithCustomError(tester, 'WindowLimitExceeded')
        .withArgs(WINDOW_1D, 0, 1);
    });

    it('should allow zero amount consume as checkpoint only', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(parseUnits('500'));

      const [, amountInFlightBefore, lastUpdatedAfterConsume] =
        await tester.getWindowConfigPublic(WINDOW_1D);

      await time.increase(hours(6));

      await tester.consumeLimitPublic(0);

      const [, amountInFlightAfter, lastUpdatedAfterCheckpoint] =
        await tester.getWindowConfigPublic(WINDOW_1D);

      const { inFlight: expectedInFlight } = calculateWindowRateLimitCapacity({
        amountInFlight: amountInFlightBefore,
        lastUpdated: lastUpdatedAfterConsume,
        limit,
        window: WINDOW_1D,
        now: lastUpdatedAfterCheckpoint,
      });

      expect(amountInFlightAfter).eq(expectedInFlight);
      expect(amountInFlightAfter).lt(amountInFlightBefore);
      expect(lastUpdatedAfterCheckpoint).eq(await getCurrentBlockTimestamp());
    });

    it('should charge every configured window', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const amount = parseUnits('100');

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.setWindowLimitPublic(WINDOW_2D, parseUnits('2000'));

      await tester.consumeLimitPublic(amount);

      const statuses = await tester.getWindowStatusesPublic();

      expect(getStatusByWindow(statuses, WINDOW_1D)!.inFlight).eq(amount);
      expect(getStatusByWindow(statuses, WINDOW_2D)!.inFlight).eq(amount);
    });

    it('should fail: when any window lacks headroom', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('100'));
      await tester.setWindowLimitPublic(WINDOW_2D, parseUnits('1000'));

      await expect(
        tester.consumeLimitPublic(parseUnits('200')),
      ).to.be.revertedWithCustomError(tester, 'WindowLimitExceeded');
    });

    it('should allow consume after partial linear decay', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(limit);

      await time.increase(hours(1));

      const statusesBefore = await tester.getWindowStatusesPublic();
      const remainingBefore = getStatusByWindow(
        statusesBefore,
        WINDOW_1D,
      )!.remaining;

      expect(remainingBefore).gt(0);
      expect(remainingBefore).lt(limit);

      await tester.consumeLimitPublic(remainingBefore);

      const statusesAfter = await tester.getWindowStatusesPublic();
      const statusAfter = getStatusByWindow(statusesAfter, WINDOW_1D)!;

      expect(statusAfter.inFlight.add(statusAfter.remaining)).eq(limit);
    });
  });

  describe('getWindowStatuses()', () => {
    it('should return an empty array when no windows are configured', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      expect((await tester.getWindowStatusesPublic()).length).eq(0);
    });

    it('should reflect linear decay after time passes', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(limit);

      const [, , lastUpdatedBefore] = await tester.getWindowConfigPublic(
        WINDOW_1D,
      );

      await time.increase(hours(1));

      await expectStatusMatchesCapacity(
        tester,
        WINDOW_1D,
        limit,
        limit,
        WINDOW_1D,
        lastUpdatedBefore,
      );
    });

    it('should restore full remaining after a full window elapses', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(limit);

      await time.increase(WINDOW_1D);

      const statuses = await tester.getWindowStatusesPublic();
      const status = getStatusByWindow(statuses, WINDOW_1D);

      expect(status!.inFlight).eq(0);
      expect(status!.remaining).eq(limit);
    });

    it('should return zero remaining when decayed in-flight equals limit', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1000');

      await tester.setWindowLimitPublic(WINDOW_1D, limit);
      await tester.consumeLimitPublic(limit);

      const statuses = await tester.getWindowStatusesPublic();
      expect(getStatusByWindow(statuses, WINDOW_1D)!.remaining).eq(0);
    });

    it('should return multiple statuses after multiple windows are added', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.setWindowLimitPublic(WINDOW_2D, parseUnits('2000'));

      const statuses = await tester.getWindowStatusesPublic();

      expect(statuses.length).eq(2);

      const windows = statuses.map((s) => s.window.toNumber()).sort();
      expect(windows).deep.eq([WINDOW_1D, WINDOW_2D].sort());
    });

    it('should match decay math when elapsed is between 0 and window', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('100000');
      const window = days(1);

      await tester.setWindowLimitPublic(window, limit);
      await tester.consumeLimitPublic(parseUnits('80000'));

      const [, amountInFlight, lastUpdated] =
        await tester.getWindowConfigPublic(window);

      await time.increase(minutes(30));

      await expectStatusMatchesCapacity(
        tester,
        window,
        amountInFlight,
        limit,
        window,
        lastUpdated,
      );
    });

    it('should treat stored in-flight above limit as zero remaining', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('500');

      await tester.setWindowLimitPublic(WINDOW_1D, parseUnits('1000'));
      await tester.consumeLimitPublic(parseUnits('800'));

      await tester.setWindowLimitPublic(WINDOW_1D, limit);

      const statuses = await tester.getWindowStatusesPublic();
      const status = getStatusByWindow(statuses, WINDOW_1D);

      expect(status!.limit).eq(limit);
      expect(status!.remaining).eq(0);
    });

    it('should show a 1 wei floor gap between split and single mulDiv', async () => {
      const limit = parseUnits('1');
      const window = MIN_WINDOW + 1;
      const { leftElapsed, rightElapsed } = findOneWeiMulDivSplitGap(
        limit,
        window,
      );

      const singleDecay = mulDiv(limit, leftElapsed + rightElapsed, window);
      const splitDecay = mulDiv(limit, leftElapsed, window).add(
        mulDiv(limit, rightElapsed, window),
      );

      expect(singleDecay.sub(splitDecay)).eq(1);
    });

    it('should reproduce snapshot-based 1 wei drift while on-chain keeps exact stored-state math', async () => {
      const { tester } = await loadFixture(rateLimitLibraryFixture);
      const limit = parseUnits('1');
      const window = MIN_WINDOW + 1;
      const consumed = parseUnits('1');
      const addedAmount = 0;
      const { leftElapsed, rightElapsed } = findOneWeiMulDivSplitGap(
        limit,
        window,
      );

      await tester.setWindowLimitPublic(window, limit);
      await tester.consumeLimitPublic(consumed);

      const [, storedBefore, lastUpdatedStoredBefore] =
        await tester.getWindowConfigPublic(window);

      await time.increase(leftElapsed);
      const t1 = await getCurrentBlockTimestamp();

      const snapshotAtT1 = getStatusByWindow(
        await tester.getWindowStatusesPublic(),
        window,
      )!;

      await time.increase(rightElapsed);

      await tester.consumeLimitPublic(addedAmount);

      const [, storedAfter, lastUpdatedAfter] =
        await tester.getWindowConfigPublic(window);

      const correctAtCheckpoint = calculateWindowRateLimitCapacity({
        amountInFlight: storedBefore,
        lastUpdated: lastUpdatedStoredBefore,
        limit,
        window,
        now: lastUpdatedAfter,
      }).inFlight;
      const expectedStoredAfter = correctAtCheckpoint.add(addedAmount);

      const snapshotBasedAtCheckpoint = calculateWindowRateLimitCapacity({
        amountInFlight: snapshotAtT1.inFlight,
        lastUpdated: t1,
        limit,
        window,
        now: lastUpdatedAfter,
      }).inFlight;
      const naiveExpectedStoredAfter =
        snapshotBasedAtCheckpoint.add(addedAmount);

      const driftAbs = expectedStoredAfter.gte(naiveExpectedStoredAfter)
        ? expectedStoredAfter.sub(naiveExpectedStoredAfter)
        : naiveExpectedStoredAfter.sub(expectedStoredAfter);
      expect(driftAbs).eq(1);
      expect(storedAfter).eq(expectedStoredAfter);
      const onchainVsNaiveAbs = storedAfter.gte(naiveExpectedStoredAfter)
        ? storedAfter.sub(naiveExpectedStoredAfter)
        : naiveExpectedStoredAfter.sub(storedAfter);
      expect(onchainVsNaiveAbs).eq(1);
    });
  });
});
