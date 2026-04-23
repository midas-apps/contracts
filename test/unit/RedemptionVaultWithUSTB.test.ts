import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { redemptionVaultSuits } from './suits/redemption-vault.suits';

import { RedemptionVaultWithUSTBTest__factory } from '../../typechain-types';
import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  addWaivedFeeAccountTest,
} from '../common/manageable-vault.helpers';
import {
  redeemInstantTest,
  setLoanLpTest,
  setPreferLoanLiquidityTest,
} from '../common/redemption-vault.helpers';

redemptionVaultSuits(
  'RedemptionVaultWithUSTB',
  defaultDeploy,
  {
    createNew: async (owner: SignerWithAddress) =>
      new RedemptionVaultWithUSTBTest__factory(owner).deploy(),
    key: 'redemptionVaultWithUSTB',
  },
  async (fixture) => {
    const { redemptionVaultWithUSTB, ustbRedemption } = fixture;
    expect(await redemptionVaultWithUSTB.ustbRedemption()).eq(
      ustbRedemption.address,
    );
  },
  async (defaultDeploy) => {
    describe('RedemptionVaultWithUSTB', function () {
      it('failing deployment', async () => {
        const {
          mTBILL,
          tokensReceiver,
          feeReceiver,
          mTokenToUsdDataFeed,
          accessControl,
          mockedSanctionsList,
          owner,
          requestRedeemer,
        } = await loadFixture(defaultDeploy);

        const redemptionVaultWithUSTB =
          await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

        await expect(
          redemptionVaultWithUSTB[
            'initialize((address,address,uint256,uint256,address,address,address,address,uint256),(uint64,uint64,uint64,(uint256,uint256)[]),(address),(address,address,address,address,uint64),address)'
          ](
            {
              ac: accessControl.address,
              sanctionsList: mockedSanctionsList.address,
              variationTolerance: 1,
              minAmount: parseUnits('100'),
              mToken: mTBILL.address,
              mTokenDataFeed: mTokenToUsdDataFeed.address,
              feeReceiver: feeReceiver.address,
              tokensReceiver: tokensReceiver.address,
              instantFee: 100,
            },
            {
              limitConfigs: [
                {
                  limit: parseUnits('100000'),
                  window: days(1),
                },
              ],
              minInstantFee: 0,
              maxInstantFee: 10000,
              maxInstantShare: 100_00,
            },
            { requestRedeemer: requestRedeemer.address },
            {
              loanLp: constants.AddressZero,
              loanLpFeeReceiver: constants.AddressZero,
              loanRepaymentAddress: constants.AddressZero,
              loanSwapperVault: constants.AddressZero,
              maxLoanApr: 0,
            },
            constants.AddressZero,
          ),
        ).to.be.reverted;
      });

      describe('initialization', () => {
        it('should fail: call initialize() when already initialized', async () => {
          const { redemptionVaultWithUSTB } = await loadFixture(defaultDeploy);

          await expect(
            redemptionVaultWithUSTB[
              'initialize((address,address,uint256,uint256,address,address,address,address,uint256),(uint64,uint64,uint64,(uint256,uint256)[]),(address),(address,address,address,address,uint64),address)'
            ](
              {
                ac: constants.AddressZero,
                sanctionsList: constants.AddressZero,
                variationTolerance: 0,
                minAmount: 0,
                mToken: constants.AddressZero,
                mTokenDataFeed: constants.AddressZero,
                feeReceiver: constants.AddressZero,
                tokensReceiver: constants.AddressZero,
                instantFee: 0,
              },
              {
                limitConfigs: [],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
              { requestRedeemer: constants.AddressZero },
              {
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
                maxLoanApr: 0,
              },
              constants.AddressZero,
            ),
          ).revertedWith('Initializable: contract is already initialized');
        });

        it('should fail: when ustbRedemption address zero', async () => {
          const {
            owner,
            accessControl,
            mTBILL,
            tokensReceiver,
            feeReceiver,
            mTokenToUsdDataFeed,
            mockedSanctionsList,
            requestRedeemer,
          } = await loadFixture(defaultDeploy);

          const redemptionVaultWithUSTB =
            await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

          await expect(
            redemptionVaultWithUSTB[
              'initialize((address,address,uint256,uint256,address,address,address,address,uint256),(uint64,uint64,uint64,(uint256,uint256)[]),(address),(address,address,address,address,uint64),address)'
            ](
              {
                ac: accessControl.address,
                sanctionsList: mockedSanctionsList.address,
                variationTolerance: 1,
                minAmount: 1000,
                mToken: mTBILL.address,
                mTokenDataFeed: mTokenToUsdDataFeed.address,
                feeReceiver: feeReceiver.address,
                tokensReceiver: tokensReceiver.address,
                instantFee: 100,
              },
              {
                limitConfigs: [
                  {
                    limit: parseUnits('100000'),
                    window: days(1),
                  },
                ],
                minInstantFee: 0,
                maxInstantFee: 10000,
                maxInstantShare: 100_00,
              },
              { requestRedeemer: requestRedeemer.address },
              {
                loanLp: constants.AddressZero,
                loanLpFeeReceiver: constants.AddressZero,
                loanRepaymentAddress: constants.AddressZero,
                loanSwapperVault: constants.AddressZero,
                maxLoanApr: 0,
              },
              constants.AddressZero,
            ),
          ).revertedWith('zero address');
        });
      });

      describe('redeemInstant()', () => {
        describe('preferLoanLiquidity=true', () => {
          it('redeem 100 mTBILL when vault has enough USDC (no USTB needed)', async () => {
            const {
              owner,
              redemptionVaultWithUSTB,
              stableCoins,
              mTBILL,
              mTokenToUsdDataFeed,
              dataFeed,
              ustbToken,
            } = await loadFixture(defaultDeploy);

            await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100000);
            await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
            await mintToken(mTBILL, owner, 100);
            await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100);
            await addPaymentTokenTest(
              { vault: redemptionVaultWithUSTB, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await setPreferLoanLiquidityTest(
              { redemptionVault: redemptionVaultWithUSTB, owner },
              true,
            );

            const ustbBalanceBefore = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );

            await redeemInstantTest(
              {
                redemptionVault: redemptionVaultWithUSTB,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
              },
              stableCoins.usdc,
              100,
            );

            const ustbBalanceAfter = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );
            expect(ustbBalanceAfter).to.equal(ustbBalanceBefore);
          });

          it('when vault has no USDC but has USTB and LP liquidity, LP liquidity should be used first', async () => {
            const {
              owner,
              mockedAggregator,
              mockedAggregatorMToken,
              redemptionVaultWithUSTB,
              stableCoins,
              mTBILL,
              dataFeed,
              mTokenToUsdDataFeed,
              ustbToken,
              ustbRedemption,
              loanLp,
              mTokenLoan,
              redemptionVaultLoanSwapper,
            } = await loadFixture(defaultDeploy);

            await ustbRedemption.setChainlinkData(parseUnits('1', 8), false);
            await ustbRedemption.setMaxUstbRedemptionAmount(
              parseUnits('2000', 6),
            );
            await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);

            await mintToken(
              stableCoins.usdc,
              redemptionVaultLoanSwapper,
              100000,
            );
            await mintToken(mTokenLoan, loanLp, 100000);
            await approveBase18(
              loanLp,
              mTokenLoan,
              redemptionVaultWithUSTB,
              100000,
            );

            await mintToken(mTBILL, owner, 1000);
            await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
            await addPaymentTokenTest(
              { vault: redemptionVaultWithUSTB, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await setInstantFeeTest(
              { vault: redemptionVaultWithUSTB, owner },
              0,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setPreferLoanLiquidityTest(
              { redemptionVault: redemptionVaultWithUSTB, owner },
              true,
            );

            const ustbBalanceBefore = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );
            const loanLpBalanceBefore = await mTokenLoan.balanceOf(
              loanLp.address,
            );

            await redeemInstantTest(
              {
                redemptionVault: redemptionVaultWithUSTB,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                additionalLiquidity: async () => {
                  return parseUnits('300', 6);
                },
              },
              stableCoins.usdc,
              1000,
            );

            const ustbBalanceAfter = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );
            const loanLpBalanceAfter = await mTokenLoan.balanceOf(
              loanLp.address,
            );

            expect(ustbBalanceAfter).to.equal(ustbBalanceBefore);
            expect(loanLpBalanceAfter).to.be.lt(loanLpBalanceBefore);
          });

          it('redeem 1000 mTBILL, when vault has no USDC but has USTB', async () => {
            const {
              owner,
              mockedAggregator,
              mockedAggregatorMToken,
              redemptionVaultWithUSTB,
              stableCoins,
              mTBILL,
              dataFeed,
              mTokenToUsdDataFeed,
              ustbToken,
              ustbRedemption,
            } = await loadFixture(defaultDeploy);

            await ustbRedemption.setChainlinkData(parseUnits('1', 8), false);
            await ustbRedemption.setMaxUstbRedemptionAmount(
              parseUnits('2000', 6),
            );
            await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
            await mintToken(mTBILL, owner, 1000);
            await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
            await addPaymentTokenTest(
              { vault: redemptionVaultWithUSTB, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await setInstantFeeTest(
              { vault: redemptionVaultWithUSTB, owner },
              0,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setPreferLoanLiquidityTest(
              { redemptionVault: redemptionVaultWithUSTB, owner },
              true,
            );

            const ustbBalanceBefore = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );

            await redeemInstantTest(
              {
                redemptionVault: redemptionVaultWithUSTB,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                additionalLiquidity: async () => {
                  return (
                    await ustbRedemption.calculateUsdcOut(
                      await ustbToken.balanceOf(
                        redemptionVaultWithUSTB.address,
                      ),
                    )
                  ).usdcOutAmountAfterFee;
                },
              },
              stableCoins.usdc,
              1000,
            );

            const ustbBalanceAfter = await ustbToken.balanceOf(
              redemptionVaultWithUSTB.address,
            );
            expect(ustbBalanceAfter).to.be.lt(ustbBalanceBefore);
          });

          it('when vault partially has USDC, partially has USTB and partially has LP liquidity, so all the liquidity should be used', async () => {
            const {
              owner,
              mockedAggregator,
              mockedAggregatorMToken,
              redemptionVaultWithUSTB,
              stableCoins,
              mTBILL,
              dataFeed,
              mTokenToUsdDataFeed,
              ustbToken,
              ustbRedemption,
              loanLp,
              mTokenLoan,
              redemptionVaultLoanSwapper,
            } = await loadFixture(defaultDeploy);

            await ustbRedemption.setChainlinkData(parseUnits('1', 8), false);
            await ustbRedemption.setMaxUstbRedemptionAmount(
              parseUnits('2000', 6),
            );
            await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
            await mintToken(stableCoins.usdc, redemptionVaultLoanSwapper, 300);
            await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 400);
            await mintToken(mTokenLoan, loanLp, 300);
            await approveBase18(
              loanLp,
              mTokenLoan,
              redemptionVaultWithUSTB,
              300,
            );

            await mintToken(mTBILL, owner, 1000);
            await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
            await addPaymentTokenTest(
              { vault: redemptionVaultWithUSTB, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await addPaymentTokenTest(
              { vault: redemptionVaultLoanSwapper, owner },
              stableCoins.usdc,
              dataFeed.address,
              0,
              true,
            );
            await setInstantFeeTest(
              { vault: redemptionVaultWithUSTB, owner },
              0,
            );
            await setRoundData({ mockedAggregator }, 1);
            await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
            await setPreferLoanLiquidityTest(
              { redemptionVault: redemptionVaultWithUSTB, owner },
              true,
            );

            await redeemInstantTest(
              {
                redemptionVault: redemptionVaultWithUSTB,
                owner,
                mTBILL,
                mTokenToUsdDataFeed,
                additionalLiquidity: async () => {
                  return (
                    await ustbRedemption.calculateUsdcOut(
                      await ustbToken.balanceOf(
                        redemptionVaultWithUSTB.address,
                      ),
                    )
                  ).usdcOutAmountAfterFee;
                },
              },
              stableCoins.usdc,
              1000,
            );

            expect(
              await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
            ).to.be.lt(parseUnits('9900', 6));
            expect(
              await stableCoins.usdc.balanceOf(redemptionVaultWithUSTB.address),
            ).eq(0);
            expect(
              await stableCoins.usdc.balanceOf(
                redemptionVaultLoanSwapper.address,
              ),
            ).eq(0);
            expect(await mTokenLoan.balanceOf(loanLp.address)).eq(0);
          });
        });

        it('should fail: user try to instant redeem more than contract can redeem and it hits loan lp flow', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            mTokenToUsdDataFeed,
            dataFeed,
            ustbToken,
          } = await loadFixture(defaultDeploy);

          await setLoanLpTest(
            { redemptionVault: redemptionVaultWithUSTB, owner },
            constants.AddressZero,
          );

          await mintToken(mTBILL, owner, 100000);
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 100);

          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);

          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );

          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
            },
            stableCoins.usdc,
            100000,
            {
              revertMessage: 'RV: loan lp not configured',
            },
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract does not have USDC, but has 9900 USTB', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setInstantFeeTest({ vault: redemptionVaultWithUSTB, owner }, 0);
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          const ustbBalanceBefore = await ustbToken.balanceOf(
            redemptionVaultWithUSTB.address,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('1000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );

          const ustbBalanceAfter = await ustbToken.balanceOf(
            redemptionVaultWithUSTB.address,
          );

          expect(ustbBalanceAfter).to.be.lt(ustbBalanceBefore);
        });

        it('redeem 1000 mTBILL, when price of stable is 1$ and mToken price is 1$ and contract has 100 USDC and 9900 USTB', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 9900);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );
          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('1000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB without checking of minDepositAmount', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await redemptionVaultWithUSTB.freeFromMinAmount(owner.address, true);

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('6000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('redeem 1000 mTBILL, when price of stable is 1.03$ and mToken price is 5$ and contract has 100 USDC and sufficient USTB and user in waivedFeeRestriction', async () => {
          const {
            owner,
            mockedAggregator,
            mockedAggregatorMToken,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);
          await mintToken(ustbToken, redemptionVaultWithUSTB, 15000);
          await mintToken(mTBILL, owner, 1000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 1000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            100,
            true,
          );
          await setRoundData({ mockedAggregator }, 1.03);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);

          await addWaivedFeeAccountTest(
            { vault: redemptionVaultWithUSTB, owner },
            owner.address,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('6000', 6),
          );
          await redeemInstantTest(
            {
              redemptionVault: redemptionVaultWithUSTB,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              waivedFee: true,
              additionalLiquidity: async () => {
                return (
                  await ustbRedemption.calculateUsdcOut(
                    await ustbToken.balanceOf(redemptionVaultWithUSTB.address),
                  )
                ).usdcOutAmountAfterFee;
              },
            },
            stableCoins.usdc,
            1000,
          );
        });

        it('should fail: when redemption exceeds available USDC in USTB redemption contract', async () => {
          const {
            owner,
            redemptionVaultWithUSTB,
            stableCoins,
            mTBILL,
            dataFeed,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(ustbToken, redemptionVaultWithUSTB, 1000000);
          await mintToken(stableCoins.usdc, redemptionVaultWithUSTB, 100);

          const mockBalance = await stableCoins.usdc.balanceOf(
            ustbRedemption.address,
          );
          await ustbRedemption.withdraw(
            stableCoins.usdc.address,
            owner.address,
            mockBalance,
          );

          expect(
            await stableCoins.usdc.balanceOf(ustbRedemption.address),
          ).to.equal(0);

          await mintToken(mTBILL, owner, 100000);
          await approveBase18(owner, mTBILL, redemptionVaultWithUSTB, 100000);
          await addPaymentTokenTest(
            { vault: redemptionVaultWithUSTB, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          // Try to redeem - should fail because USTB redemption has no USDC
          await expect(
            redemptionVaultWithUSTB['redeemInstant(address,uint256,uint256)'](
              stableCoins.usdc.address,
              parseUnits('10000'),
              0,
            ),
          ).to.be.revertedWith('USTBRedemptionMock: InsufficientBalance');
        });
      });

      describe('redeemInstant() complex', () => {
        it('redeem 100 mtbill, when price is 5$ and contract balance 100 USDC and USTB to cover remaining amount, 125 mtbill when price is 5.1$, 114 mtbill when price is 5.4$', async () => {
          const {
            owner,
            mockedAggregator,
            redemptionVaultWithUSTB: redemptionVault,
            stableCoins,
            mTBILL,
            dataFeed,
            mTokenToUsdDataFeed,
            mockedAggregatorMToken,
            ustbToken,
            ustbRedemption,
          } = await loadFixture(defaultDeploy);

          await ustbRedemption.setChainlinkData(parseUnits('1', 8), false); // Set USTB price to $1

          await mintToken(mTBILL, owner, 100 + 125 + 114);

          await mintToken(stableCoins.usdc, redemptionVault, 100);
          await mintToken(ustbToken, redemptionVault, 100000);

          await approveBase18(owner, mTBILL, redemptionVault, 100 + 125 + 114);

          await addPaymentTokenTest(
            { vault: redemptionVault, owner },
            stableCoins.usdc,
            dataFeed.address,
            0,
            true,
          );

          await ustbRedemption.setMaxUstbRedemptionAmount(
            parseUnits('10000', 6),
          );

          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5);
          await setRoundData({ mockedAggregator }, 1.04);

          const additionalLiquidity = async () =>
            (
              await ustbRedemption.calculateUsdcOut(
                await ustbToken.balanceOf(redemptionVault.address),
              )
            ).usdcOutAmountAfterFee;

          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            100,
          );

          await setRoundData({ mockedAggregator }, 1);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.1);
          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            125,
          );

          await setRoundData({ mockedAggregator }, 1.01);
          await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.4);
          await redeemInstantTest(
            {
              redemptionVault,
              owner,
              mTBILL,
              mTokenToUsdDataFeed,
              additionalLiquidity,
            },
            stableCoins.usdc,
            114,
          );
        });
      });
    });
  },
);
