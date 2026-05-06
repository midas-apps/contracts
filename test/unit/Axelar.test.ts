import {
  loadFixture,
  setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants, ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import hre from 'hardhat';

import { MidasAxelarVaultExecutableTester } from '../../typechain-types';
import { depositAndSend, redeemAndSend } from '../common/axelar.helpers';
import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { deployProxyContract } from '../common/deploy.helpers';
import { axelarFixture } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';

describe('Axelar', function () {
  describe('MidasAxelarVaultExecutable', () => {
    it('deployment', async () => {
      const fixture = await loadFixture(axelarFixture);
      const {
        executor,
        mTokenId,
        mTBILL,
        chainNameHashA,
        axelarItsA,
        mTokenToUsdDataFeed,
        depositVault,
        redemptionVault,
        paymentTokenId,
        stableCoins,
      } = fixture;

      expect(await executor.interchainTokenService()).to.equal(
        axelarItsA.address,
      );
      expect(await executor.chainNameHash()).to.equal(chainNameHashA);

      expect(await executor.depositVault()).to.equal(depositVault.address);
      expect(await executor.redemptionVault()).to.equal(
        redemptionVault.address,
      );
      expect(await executor.paymentTokenId()).to.equal(paymentTokenId);
      expect(await executor.mTokenId()).to.equal(mTokenId);
      expect(await executor.mTokenErc20()).to.equal(mTBILL.address);
      expect(await executor.paymentTokenErc20()).to.equal(
        stableCoins.usdt.address,
      );
      expect(await executor.paymentTokenDecimals()).to.equal(
        await stableCoins.usdt.decimals(),
      );
      expect(
        await stableCoins.usdt.allowance(executor.address, axelarItsA.address),
      ).to.equal(constants.MaxUint256);
      expect(
        await stableCoins.usdt.allowance(
          executor.address,
          depositVault.address,
        ),
      ).to.equal(constants.MaxUint256);
      expect(
        await mTBILL.allowance(executor.address, redemptionVault.address),
      ).to.equal(constants.MaxUint256);
    });

    describe('depositAndSend', () => {
      it('should deposit and send mTBILL from A to A', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, depositVault, stableCoins, owner, dataFeed } =
          fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await depositAndSend(fixture, {
          amount: 100,
        });
      });

      it('should directly send tokens during deposit without calling ITS when depositing to the same chain', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          depositVault,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
        } = fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await axelarItsA.setShouldRevert(true);
        await depositAndSend(fixture, {
          amount: 100,
        });
      });

      it('should deposit and send mTBILL from A to A with referrerId', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, depositVault, stableCoins, owner, dataFeed } =
          fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await depositAndSend(fixture, {
          amount: 100,
          referrerId: ethers.utils.solidityKeccak256(
            ['string'],
            ['TEST_REFERRER_ID'],
          ),
        });
      });

      it('should deposit and send mTBILL from A to B', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, depositVault, stableCoins, owner, dataFeed } =
          fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await depositAndSend(fixture, {
          amount: 100,
          direction: 'A_TO_B',
        });
      });

      it('should fail: when deposit mTBILL from A to B and ITS reverts', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          depositVault,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
        } = fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await axelarItsA.setShouldRevert(true);

        await depositAndSend(
          fixture,
          {
            amount: 100,
            direction: 'A_TO_B',
          },
          {
            revertMessage: 'interchainTransfer reverted',
          },
        );
      });

      it('should fail: when exceeds slippage', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          depositVault,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
        } = fixture;

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: depositVault, owner }, 0);

        await mintToken(stableCoins.usdt, fixture.owner, 100);
        await approveBase18(fixture.owner, stableCoins.usdt, executor, 100);

        await axelarItsA.setShouldRevert(true);

        await depositAndSend(
          fixture,
          {
            amount: 100,
            direction: 'A_TO_B',
            minReceiveAmount: parseUnits('101'),
          },
          {
            revertMessage: 'DV: minReceiveAmount > actual',
          },
        );
      });
    });

    describe('redeemAndSend', () => {
      it('should redeem and send USDT from A to A', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          redemptionVault,
          mTBILL,
          stableCoins,
          owner,
          dataFeed,
        } = fixture;

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);

        await mintToken(mTBILL, fixture.owner, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 10000);
        await approveBase18(fixture.owner, mTBILL, executor, 100);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await redeemAndSend(fixture, {
          amount: 100,
        });
      });

      it('should directly send tokens during redeem without calling ITS when redeeming to the same chain', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          redemptionVault,
          mTBILL,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
          axelarItsB,
        } = fixture;

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);

        await mintToken(mTBILL, fixture.owner, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 10000);
        await approveBase18(fixture.owner, mTBILL, executor, 100);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await axelarItsA.setShouldRevert(true);
        await axelarItsB.setShouldRevert(true);

        await redeemAndSend(fixture, {
          amount: 100,
        });
      });

      it('should deposit and send mTBILL from A to B', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          redemptionVault,
          mTBILL,
          stableCoins,
          owner,
          dataFeed,
        } = fixture;

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await mintToken(mTBILL, fixture.owner, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 10000);
        await approveBase18(fixture.owner, mTBILL, executor, 100);

        await redeemAndSend(fixture, {
          amount: 100,
          direction: 'A_TO_B',
        });
      });

      it('should fail: when deposit mTBILL from A to B and ITS reverts', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          redemptionVault,
          mTBILL,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
        } = fixture;

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await mintToken(mTBILL, fixture.owner, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 10000);
        await approveBase18(fixture.owner, mTBILL, executor, 100);

        await axelarItsA.setShouldRevert(true);

        await redeemAndSend(
          fixture,
          {
            amount: 100,
            direction: 'A_TO_B',
          },
          {
            revertMessage: 'interchainTransfer reverted',
          },
        );
      });

      it('should fail: when exceeds slippage', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          redemptionVault,
          mTBILL,
          stableCoins,
          owner,
          dataFeed,
          axelarItsA,
        } = fixture;

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await mintToken(mTBILL, fixture.owner, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 10000);
        await approveBase18(fixture.owner, mTBILL, executor, 100);

        await axelarItsA.setShouldRevert(true);

        await redeemAndSend(
          fixture,
          {
            amount: 100,
            direction: 'A_TO_B',
            minReceiveAmount: parseUnits('1000'),
          },
          {
            revertMessage: 'RV: minReceiveAmount > actual',
          },
        );
      });
    });

    describe('handleExecuteWithInterchainToken()', () => {
      it('should fail: when caller is not self', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, owner, mTokenId } = fixture;

        await expect(
          executor
            .connect(owner)
            .handleExecuteWithInterchainToken(
              owner.address,
              '0x',
              mTokenId,
              100,
            ),
        ).revertedWithCustomError(executor, 'OnlySelf');
      });
    });

    describe('executeWithInterchainToken()', () => {
      it('should fail: when caller is not the service', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, owner, mTBILL } = fixture;

        await expect(
          executor
            .connect(owner)
            .executeWithInterchainToken(
              ethers.constants.HashZero,
              '0x',
              '0x',
              '0x',
              ethers.constants.HashZero,
              mTBILL.address,
              '1',
            ),
        ).revertedWithCustomError(executor, 'NotService');
      });

      it('should fail: when taken id is not the mToken or paymentToken', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, mTBILL, axelarItsA } = fixture;

        const serviceSigner = await hre.ethers.getImpersonatedSigner(
          axelarItsA.address,
        );

        await setBalance(serviceSigner.address, parseUnits('100'));
        await expect(
          executor
            .connect(serviceSigner)
            .executeWithInterchainToken(
              ethers.constants.HashZero,
              '0x',
              '0x',
              '0x',
              ethers.constants.HashZero,
              mTBILL.address,
              '1',
            ),
        ).revertedWithCustomError(executor, 'OnlyValidExecutableTokenId');
      });

      it('when error is thrown, should perform the refund', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, mTBILL, axelarItsA, chainNameB, owner, mTokenId } =
          fixture;

        const serviceSigner = await hre.ethers.getImpersonatedSigner(
          axelarItsA.address,
        );

        await setBalance(serviceSigner.address, parseUnits('100'));

        const balanceBefore = await mTBILL.balanceOf(owner.address);

        await mintToken(mTBILL, executor.address, 1);
        await expect(
          executor
            .connect(serviceSigner)
            .executeWithInterchainToken(
              ethers.constants.HashZero,
              chainNameB,
              ethers.utils.solidityPack(['address'], [owner.address]),
              '0x',
              mTokenId,
              mTBILL.address,
              parseUnits('1'),
            ),
        ).not.reverted;

        const balanceAfter = await mTBILL.balanceOf(owner.address);
        expect(balanceAfter).to.equal(balanceBefore.add(parseUnits('1')));
      });
    });

    describe('_redeem', () => {
      it('redeem and check that received amount is correct', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          executor,
          mTBILL,
          owner,
          redemptionVault,
          stableCoins,
          dataFeed,
          mockedAggregatorMToken,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(mTBILL, executor.address, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 200);

        expect(
          await executor.callStatic.redeemPublic(
            owner.address,
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100'));

        await expect(executor.redeemPublic(owner.address, parseUnits('50'), 0))
          .not.reverted;
      });

      it('redeem and check that received amount is correct when ptoken decimals is not 18', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          stableCoins,
          redemptionVault,
          mTBILL,
          owner,
          mTokenId,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          paymentTokenId,
          axelarItsB,
          axelarItsA,
        } = fixture;

        await axelarItsB.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        await axelarItsA.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        const executor =
          await deployProxyContract<MidasAxelarVaultExecutableTester>(
            'MidasAxelarVaultExecutableTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              paymentTokenId,
              mTokenId,
              axelarItsA.address,
            ],
          );

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdc,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(mTBILL, executor, 100);
        await mintToken(stableCoins.usdc, redemptionVault, 200);

        expect(
          await executor.callStatic.redeemPublic(
            owner.address,
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100', 8));

        await expect(executor.redeemPublic(owner.address, parseUnits('50'), 0))
          .not.reverted;
      });

      it('redeem and check that passed params to underlying redeemInstant are correct', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          axelarItsA,
          axelarItsB,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          mTokenId,
          paymentTokenId,
          mTBILL,
        } = fixture;

        await axelarItsA.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        await axelarItsB.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        const executor =
          await deployProxyContract<MidasAxelarVaultExecutableTester>(
            'MidasAxelarVaultExecutableTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              paymentTokenId,
              mTokenId,
              axelarItsA.address,
            ],
          );

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdc,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(mTBILL, executor, 100);
        await mintToken(stableCoins.usdc, redemptionVault, 200);

        expect(
          await executor.callStatic.redeemPublic(
            owner.address,
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100', 8));

        await expect(executor.redeemPublic(owner.address, parseUnits('50'), 0))
          .emit(
            redemptionVault,
            redemptionVault.interface.events[
              'RedeemInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256)'
            ].name,
          )
          .withArgs(
            executor.address,
            stableCoins.usdc.address,
            owner.address,
            parseUnits('50'),
            0,
            parseUnits('100'),
          );
      });
    });

    describe('_deposit', () => {
      it('deposit and check that received amount is correct', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          executor,
          mTBILL,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(stableCoins.usdt, executor, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await executor.callStatic.depositPublic(
            owner.address,
            parseUnits('100'),
            0,
            constants.HashZero,
          ),
        ).eq(parseUnits('50'));

        await expect(
          executor.depositPublic(
            owner.address,
            parseUnits('100'),
            0,
            constants.HashZero,
          ),
        ).not.reverted;
      });

      it('deposit and check that received amount is correct when ptoken decimals is not 18', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          mTBILL,
          axelarItsA,
          axelarItsB,
          paymentTokenId,
          mTokenId,
        } = fixture;

        await axelarItsA.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        await axelarItsB.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        const executor =
          await deployProxyContract<MidasAxelarVaultExecutableTester>(
            'MidasAxelarVaultExecutableTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              paymentTokenId,
              mTokenId,
              axelarItsA.address,
            ],
          );

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdc,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(stableCoins.usdc, executor, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await executor.callStatic.depositPublic(
            owner.address,
            parseUnits('100', 8),
            0,
            constants.HashZero,
          ),
        ).eq(parseUnits('50'));

        await expect(
          executor.depositPublic(
            owner.address,
            parseUnits('100', 8),
            0,
            constants.HashZero,
          ),
        ).not.reverted;
      });

      it('deposit and check that passed params to underlying depositInstant are correct', async () => {
        const fixture = await loadFixture(axelarFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          axelarItsA,
          axelarItsB,
          paymentTokenId,
          mTokenId,
        } = fixture;

        await axelarItsA.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        await axelarItsB.registerToken(
          paymentTokenId,
          stableCoins.usdc.address,
          false,
        );

        const executor =
          await deployProxyContract<MidasAxelarVaultExecutableTester>(
            'MidasAxelarVaultExecutableTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              paymentTokenId,
              mTokenId,
              axelarItsA.address,
            ],
          );

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdc,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await mintToken(stableCoins.usdc, executor, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await executor.callStatic.depositPublic(
            owner.address,
            parseUnits('100', 8),
            0,
            constants.HashZero,
          ),
        ).eq(parseUnits('50'));

        await expect(
          executor.depositPublic(
            owner.address,
            parseUnits('100', 8),
            0,
            constants.HashZero,
          ),
        )
          .emit(
            depositVault,
            depositVault.interface.events[
              'DepositInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256,uint256,bytes32)'
            ].name,
          )
          .withArgs(
            executor.address,
            stableCoins.usdc.address,
            owner.address,
            parseUnits('100'),
            parseUnits('100'),
            0,
            parseUnits('50'),
            constants.HashZero,
          );
      });
    });

    describe('_bytesToAddress', () => {
      it('should convert a bytes to an address', async () => {
        const fixture = await loadFixture(axelarFixture);
        const { executor, owner } = fixture;

        expect(
          await executor.callStatic.bytesToAddressPublic(
            ethers.utils.solidityPack(['address'], [owner.address]),
          ),
        ).to.equal(owner.address);
      });
    });
  });
});
