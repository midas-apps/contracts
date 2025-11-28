import {
  loadFixture,
  setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';

import {
  Delay,
  EnforceDelayModifierGuard,
  GnosisSafe,
  TokensWithdrawModule,
} from '../../typechain-types';
import { mintToken, mintToken721 } from '../common/common.helpers';
import { safeFixture, SafeFixture } from '../common/fixtures';

const testSuite = (
  testVariations: {
    title: string;
    fixture: () => Promise<
      SafeFixture & {
        safe: GnosisSafe;
        delayModule: Delay;
        guard: EnforceDelayModifierGuard;
        withdrawTokensModule: TokensWithdrawModule;
        sendSafeTx: SafeFixture['sendSafeTxSingleSigner'];
      }
    >;
  }[],
) => {
  const describeVariation = (
    describeFn: (fixture: (typeof testVariations)[number]['fixture']) => void,
  ) => {
    for (const variation of testVariations) {
      describe(variation.title, async () => {
        describeFn(variation.fixture);
      });
    }
  };

  describe('Safe Setup', () => {
    describe('Safe', () => {
      describe('execTransaction()', () => {
        describeVariation((fixture) => {
          it('should fail: destination is not the delay module', async () => {
            const { deployer, sendSafeTx, guard } = await loadFixture(fixture);

            await expect(
              sendSafeTx(() => ({
                to: deployer.address,
                value: parseEther('1'),
              })),
            ).to.be.revertedWithCustomError(guard, 'TargetNotDelayModifier');
          });

          it('should fail: call delay module other function than execTransactionFromModule/execTransactionFromModuleReturnData bypassing the tx timelock', async () => {
            const { sendSafeTx, guard, delayModule } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.setTxExpiration(2000),
              ),
            ).to.be.revertedWithCustomError(guard, 'TargetFunctionNotAllowed');
          });

          it('destination is the delay module, should create a delayed tx', async () => {
            const { deployer, sendSafeTx, delayModule } = await loadFixture(
              fixture,
            );

            const hash = await delayModule.getTransactionHash(
              deployer.address,
              parseEther('1'),
              '0x',
              0,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    deployer.address,
                    parseEther('1'),
                    '0x',
                    0,
                  ),
              ),
            ).not.to.be.reverted;
            expect((await delayModule.queueNonce()).eq(1));
            expect(await delayModule.txHash(0)).eq(hash);
          });

          it('destination is the delay module, should create a delayed tx, wait and execute it', async () => {
            const { regularAccounts, sendSafeTx, delayModule, safe } =
              await loadFixture(fixture);

            const hash = await delayModule.getTransactionHash(
              regularAccounts[0].address,
              parseEther('1'),
              '0x',
              0,
            );

            await setBalance(safe.address, parseEther('1'));
            const balanceBefore = await regularAccounts[0].getBalance();
            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    regularAccounts[0].address,
                    parseEther('1'),
                    '0x',
                    0,
                  ),
                true,
              ),
            ).not.to.be.reverted;

            const balanceAfter = await regularAccounts[0].getBalance();
            expect((await delayModule.queueNonce()).eq(1));
            expect((await delayModule.txNonce()).eq(1));
            expect(await delayModule.txHash(0)).eq(hash);
            expect(balanceAfter.sub(balanceBefore)).eq(parseEther('1'));
          });

          it('call setTxExpiration on delay module expecting the timelock', async () => {
            const { sendSafeTx, delayModule } = await loadFixture(fixture);

            const hash = await delayModule.getTransactionHash(
              delayModule.address,
              0,
              delayModule.interface.encodeFunctionData('setTxExpiration', [
                2000,
              ]),
              0,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'setTxExpiration',
                      [2000],
                    ),
                    0,
                  ),
                true,
              ),
            ).not.to.be.reverted;

            expect(await delayModule.queueNonce()).eq(1);
            expect(await delayModule.txNonce()).eq(1);
            expect(await delayModule.txHash(0)).eq(hash);
            expect(await delayModule.txExpiration()).eq(2000);
          });
        });
      });
    });

    describe('Delay Module', () => {
      describeVariation((fixture) => {
        it('deployment', async () => {
          const { safe, delayModule } = await loadFixture(fixture);

          expect(await delayModule.owner()).eq(safe.address);
          expect(await delayModule.target()).eq(safe.address);
          expect(await delayModule.avatar()).eq(safe.address);
          expect(await delayModule.txExpiration()).eq(3600);
          expect(await delayModule.txCooldown()).eq(3600);
          expect(await delayModule.txNonce()).eq(0);
          expect(await delayModule.queueNonce()).eq(0);
        });

        describe('setUp()', () => {
          it('should fail: when already initialized', async () => {
            const { delayModule } = await loadFixture(fixture);

            await expect(delayModule.setUp('0x')).to.be.revertedWith(
              'Initializable: contract is already initialized',
            );
          });
        });

        describe('setTxExpiration()', () => {
          it('should fail: call function directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, delayModule, guard } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.setTxExpiration(2000),
              ),
            ).to.be.revertedWithCustomError(guard, 'TargetFunctionNotAllowed');
          });

          it('should fail: set the tx expiration below 60s', async () => {
            const { sendSafeTx, delayModule, guard } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'setTxExpiration',
                      [59],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.be.revertedWith('Module transaction failed');
          });

          it('should set the tx expiration', async () => {
            const { sendSafeTx, delayModule } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'setTxExpiration',
                      [2000],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await delayModule.txExpiration()).eq(2000);
          });

          it('should set the tx expiration to 0', async () => {
            const { sendSafeTx, delayModule } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'setTxExpiration',
                      [0],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await delayModule.txExpiration()).eq(0);
          });
        });

        describe('setTxCooldown()', () => {
          it('should fail: call function directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, delayModule, guard } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.setTxCooldown(2000),
              ),
            ).to.be.revertedWithCustomError(guard, 'TargetFunctionNotAllowed');
          });

          it('should set the tx cooldown', async () => {
            const { sendSafeTx, delayModule, guard } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData('setTxCooldown', [
                      2000,
                    ]),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await delayModule.txCooldown()).eq(2000);
          });
        });

        describe('setTxNonce()', () => {
          it('should fail: when new nonce is lower than current nonce', async () => {
            const { sendSafeTx, delayModule, safe } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    safe.address,
                    1,
                    '0x',
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData('setTxNonce', [
                  0,
                ]),
              })),
            ).to.be.revertedWith('GS013');
          });

          it('should fail: when new nonce is eq to the current nonce', async () => {
            const { sendSafeTx, delayModule, safe } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    safe.address,
                    1,
                    '0x',
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData('setTxNonce', [
                  1,
                ]),
              })),
            ).to.be.revertedWith('GS013');
          });

          it('should fail: when new nonce is higher than the current queue nonce', async () => {
            const { sendSafeTx, delayModule, safe } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    safe.address,
                    1,
                    '0x',
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData('setTxNonce', [
                  2,
                ]),
              })),
            ).to.be.revertedWith('GS013');
          });

          it('call function using execTransactionFromModule', async () => {
            const { sendSafeTx, delayModule, safe } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    safe.address,
                    1,
                    '0x',
                    0,
                  ),
              ),
            ).to.not.reverted;

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData('setTxNonce', [
                  1,
                ]),
              })),
            ).to.not.reverted;
          });

          it('should set the tx nonce', async () => {
            const { sendSafeTx, delayModule, safe } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    safe.address,
                    1,
                    '0x',
                    0,
                  ),
              ),
            ).to.not.reverted;

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData('setTxNonce', [
                  1,
                ]),
              })),
            ).to.not.reverted;

            expect(await delayModule.txNonce()).eq(1);
          });
        });

        describe('transferOwnership()', () => {
          it('should transfer ownership to the new owner', async () => {
            const { sendSafeTx, delayModule, regularAccounts } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'transferOwnership',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await delayModule.owner()).eq(regularAccounts[0].address);
          });

          it('should fail: when caller is not the owner', async () => {
            const { sendSafeTx, delayModule, regularAccounts } =
              await loadFixture(fixture);

            await expect(
              delayModule
                .connect(regularAccounts[0])
                .transferOwnership(regularAccounts[1].address),
            ).to.revertedWith('Ownable: caller is not the owner');
          });

          it('should fail: when calling directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, delayModule, regularAccounts, guard } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData(
                  'transferOwnership',
                  [regularAccounts[0].address],
                ),
              })),
            ).to.be.revertedWithCustomError(guard, 'TargetFunctionNotAllowed');
          });
        });

        describe('renounceOwnership()', () => {
          it('should renounce ownership', async () => {
            const { sendSafeTx, delayModule } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'renounceOwnership',
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await delayModule.owner()).eq(constants.AddressZero);
          });

          it('should fail: when caller is not the owner', async () => {
            const { sendSafeTx, delayModule, regularAccounts } =
              await loadFixture(fixture);

            await expect(
              delayModule.connect(regularAccounts[0]).renounceOwnership(),
            ).to.revertedWith('Ownable: caller is not the owner');
          });

          it('should fail: when calling directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, delayModule, guard } = await loadFixture(
              fixture,
            );

            await expect(
              sendSafeTx(async () => ({
                to: delayModule.address,
                data: delayModule.interface.encodeFunctionData(
                  'renounceOwnership',
                ),
              })),
            ).to.be.revertedWithCustomError(guard, 'TargetFunctionNotAllowed');
          });
        });

        describe('skipExpired()', () => {
          it('should skip expired transactions', async () => {
            const { sendSafeTx, regularAccounts, delayModule } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    delayModule.address,
                    0,
                    delayModule.interface.encodeFunctionData(
                      'transferOwnership',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
              ),
            ).to.not.reverted;
            await increase(7201);
            await expect(delayModule.skipExpired()).to.not.reverted;
            expect(await delayModule.txNonce()).eq(1);
          });

          it('should not fail if the tx is not expired', async () => {
            const { delayModule } = await loadFixture(fixture);

            await expect(delayModule.skipExpired()).to.not.reverted;
          });
        });
      });
    });

    describe('WithdrawTokens Module', () => {
      describeVariation((fixture) => {
        it('deployment', async () => {
          const {
            withdrawTokensModule,
            safe,
            tokensWithdrawer,
            tokensReceiver,
          } = await loadFixture(fixture);

          expect(await withdrawTokensModule.tokensReceiver()).eq(
            tokensReceiver.address,
          );
          expect(await withdrawTokensModule.tokensWithdrawer()).eq(
            tokensWithdrawer.address,
          );
          expect(await withdrawTokensModule.target()).eq(safe.address);
          expect(await withdrawTokensModule.avatar()).eq(safe.address);
        });

        describe('withdrawTokens()', () => {
          describe('ERC20', () => {
            it('should fail: when caller is not the tokensWithdrawer', async () => {
              const { withdrawTokensModule, testERC20 } = await loadFixture(
                fixture,
              );

              await expect(
                withdrawTokensModule.withdrawTokens([
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: BigNumber.from(1),
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'NotTokensWithdrawer',
              );
            });

            it('should fail: when token address is not a valid ERC20', async () => {
              const { withdrawTokensModule, tokensWithdrawer } =
                await loadFixture(fixture);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: withdrawTokensModule.address,
                    tokenType: 0,
                    value: BigNumber.from(1),
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'ExecuteFail',
              );
            });

            it('should fail: when token balance is insufficient', async () => {
              const { withdrawTokensModule, testERC20, tokensWithdrawer } =
                await loadFixture(fixture);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: 1,
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'ExecuteFail',
              );
            });

            it('when token balance is sufficient', async () => {
              const {
                withdrawTokensModule,
                testERC20,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken(testERC20, safe, 1);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: parseUnits('1'),
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC20.balanceOf(safe.address)).eq(0);
              expect(await testERC20.balanceOf(tokensReceiver.address)).eq(
                parseUnits('1'),
              );
            });

            it('when same 2 tokens are withdrawn', async () => {
              const {
                withdrawTokensModule,
                testERC20,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken(testERC20, safe, 2);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: parseUnits('1'),
                  },
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: parseUnits('1'),
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC20.balanceOf(safe.address)).eq(0);
              expect(await testERC20.balanceOf(tokensReceiver.address)).eq(
                parseUnits('2'),
              );
            });

            it('when 2 different tokens are withdrawn', async () => {
              const {
                withdrawTokensModule,
                testERC20,
                test2ERC20,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken(testERC20, safe, 1);
              await mintToken(test2ERC20, safe, 1);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC20.address,
                    tokenType: 0,
                    value: parseUnits('1'),
                  },
                  {
                    token: test2ERC20.address,
                    tokenType: 0,
                    value: parseUnits('1'),
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC20.balanceOf(safe.address)).eq(0);
              expect(await testERC20.balanceOf(tokensReceiver.address)).eq(
                parseUnits('1'),
              );
              expect(await test2ERC20.balanceOf(safe.address)).eq(0);
              expect(await test2ERC20.balanceOf(tokensReceiver.address)).eq(
                parseUnits('1'),
              );
            });
          });

          describe('ERC721', () => {
            it('should fail: when caller is not the tokensWithdrawer', async () => {
              const { withdrawTokensModule, testERC721 } = await loadFixture(
                fixture,
              );

              await expect(
                withdrawTokensModule.withdrawTokens([
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: BigNumber.from(1),
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'NotTokensWithdrawer',
              );
            });

            it('should fail: when token address is not a valid ERC721', async () => {
              const { withdrawTokensModule, tokensWithdrawer } =
                await loadFixture(fixture);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: withdrawTokensModule.address,
                    tokenType: 1,
                    value: BigNumber.from(1),
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'ExecuteFail',
              );
            });

            it('should fail: when token balance is insufficient', async () => {
              const { withdrawTokensModule, testERC721, tokensWithdrawer } =
                await loadFixture(fixture);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: 1,
                  },
                ]),
              ).to.be.revertedWithCustomError(
                withdrawTokensModule,
                'ExecuteFail',
              );
            });

            it('when token balance is sufficient', async () => {
              const {
                withdrawTokensModule,
                testERC721,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken721(testERC721, safe, 1);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: 1,
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC721.balanceOf(safe.address)).eq(0);
              expect(await testERC721.balanceOf(tokensReceiver.address)).eq(1);
              expect(await testERC721.ownerOf(1)).eq(tokensReceiver.address);
            });

            it('when same 2 tokens are withdrawn', async () => {
              const {
                withdrawTokensModule,
                testERC721,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken721(testERC721, safe, 1);
              await mintToken721(testERC721, safe, 2);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: 1,
                  },
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: 2,
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC721.balanceOf(safe.address)).eq(0);
              expect(await testERC721.balanceOf(tokensReceiver.address)).eq(2);
              expect(await testERC721.ownerOf(1)).eq(tokensReceiver.address);
              expect(await testERC721.ownerOf(2)).eq(tokensReceiver.address);
            });

            it('when 2 different tokens are withdrawn', async () => {
              const {
                withdrawTokensModule,
                testERC721,
                test2ERC721,
                tokensWithdrawer,
                tokensReceiver,
                safe,
              } = await loadFixture(fixture);

              await mintToken721(testERC721, safe, 1);
              await mintToken721(test2ERC721, safe, 1);

              await expect(
                withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                  {
                    token: testERC721.address,
                    tokenType: 1,
                    value: 1,
                  },
                  {
                    token: test2ERC721.address,
                    tokenType: 1,
                    value: 1,
                  },
                ]),
              ).to.not.reverted;
              expect(await testERC721.balanceOf(safe.address)).eq(0);
              expect(await testERC721.balanceOf(tokensReceiver.address)).eq(1);
              expect(await testERC721.ownerOf(1)).eq(tokensReceiver.address);

              expect(await test2ERC721.balanceOf(safe.address)).eq(0);
              expect(await test2ERC721.balanceOf(tokensReceiver.address)).eq(1);
              expect(await test2ERC721.ownerOf(1)).eq(tokensReceiver.address);
            });
          });

          it('when multiple tokens are withdrawn', async () => {
            const {
              withdrawTokensModule,
              testERC20,
              testERC721,
              tokensWithdrawer,
              tokensReceiver,
              safe,
            } = await loadFixture(fixture);

            await mintToken(testERC20, safe, 1);
            await mintToken721(testERC721, safe, 1);

            await expect(
              withdrawTokensModule.connect(tokensWithdrawer).withdrawTokens([
                {
                  token: testERC20.address,
                  tokenType: 0,
                  value: parseUnits('1'),
                },
                { token: testERC721.address, tokenType: 1, value: 1 },
              ]),
            ).to.not.reverted;

            expect(await testERC20.balanceOf(safe.address)).eq(0);
            expect(await testERC20.balanceOf(tokensReceiver.address)).eq(
              parseUnits('1'),
            );
            expect(await testERC721.balanceOf(safe.address)).eq(0);
            expect(await testERC721.balanceOf(tokensReceiver.address)).eq(1);
            expect(await testERC721.ownerOf(1)).eq(tokensReceiver.address);
          });
        });

        describe('setTokensWithdrawer()', () => {
          it('should fail: when caller is not the owner', async () => {
            const { withdrawTokensModule, tokensWithdrawer } =
              await loadFixture(fixture);

            await expect(
              withdrawTokensModule
                .connect(tokensWithdrawer)
                .setTokensWithdrawer(tokensWithdrawer.address),
            ).to.be.rejectedWith('Ownable: caller is not the owner');
          });

          it('when caller is the owner', async () => {
            const {
              withdrawTokensModule,
              sendSafeTx,
              regularAccounts,
              delayModule,
            } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'setTokensWithdrawer',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.tokensWithdrawer()).eq(
              regularAccounts[0].address,
            );
          });
        });

        describe('setTokensReceiver()', () => {
          it('should fail: when caller is not the owner', async () => {
            const { withdrawTokensModule, tokensWithdrawer } =
              await loadFixture(fixture);

            await expect(
              withdrawTokensModule
                .connect(tokensWithdrawer)
                .setTokensReceiver(tokensWithdrawer.address),
            ).to.be.rejectedWith('Ownable: caller is not the owner');
          });

          it('when caller is the owner', async () => {
            const {
              withdrawTokensModule,
              sendSafeTx,
              regularAccounts,
              delayModule,
            } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'setTokensReceiver',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.tokensReceiver()).eq(
              regularAccounts[0].address,
            );
          });
        });

        describe('setTarget()', () => {
          it('should fail: when caller is not the owner', async () => {
            const { withdrawTokensModule, tokensWithdrawer } =
              await loadFixture(fixture);

            await expect(
              withdrawTokensModule
                .connect(tokensWithdrawer)
                .setTarget(tokensWithdrawer.address),
            ).to.be.rejectedWith('Ownable: caller is not the owner');
          });

          it('when caller is the owner', async () => {
            const {
              withdrawTokensModule,
              sendSafeTx,
              regularAccounts,
              delayModule,
            } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'setTarget',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.target()).eq(
              regularAccounts[0].address,
            );
          });
        });

        describe('setAvatar()', () => {
          it('should fail: when caller is not the owner', async () => {
            const { withdrawTokensModule, tokensWithdrawer } =
              await loadFixture(fixture);

            await expect(
              withdrawTokensModule
                .connect(tokensWithdrawer)
                .setAvatar(tokensWithdrawer.address),
            ).to.be.rejectedWith('Ownable: caller is not the owner');
          });

          it('when caller is the owner', async () => {
            const {
              withdrawTokensModule,
              sendSafeTx,
              regularAccounts,
              delayModule,
            } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'setAvatar',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.avatar()).eq(
              regularAccounts[0].address,
            );
          });
        });

        describe('setUp()', () => {
          it('should fail: when already initialized', async () => {
            const { withdrawTokensModule } = await loadFixture(fixture);

            await expect(withdrawTokensModule.setUp('0x')).to.be.revertedWith(
              'Initializable: contract is already initialized',
            );
          });
        });

        describe('transferOwnership()', () => {
          it('should transfer ownership to the new owner', async () => {
            const {
              sendSafeTx,
              delayModule,
              withdrawTokensModule,
              regularAccounts,
            } = await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'transferOwnership',
                      [regularAccounts[0].address],
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.owner()).eq(
              regularAccounts[0].address,
            );
          });

          it('should fail: when caller is not the owner', async () => {
            const { withdrawTokensModule, regularAccounts } = await loadFixture(
              fixture,
            );

            await expect(
              withdrawTokensModule
                .connect(regularAccounts[0])
                .transferOwnership(regularAccounts[1].address),
            ).to.revertedWith('Ownable: caller is not the owner');
          });

          it('should fail: when calling directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, withdrawTokensModule, regularAccounts, guard } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(async () => ({
                to: withdrawTokensModule.address,
                data: withdrawTokensModule.interface.encodeFunctionData(
                  'transferOwnership',
                  [regularAccounts[0].address],
                ),
              })),
            ).to.be.revertedWithCustomError(guard, 'TargetNotDelayModifier');
          });
        });

        describe('renounceOwnership()', () => {
          it('should renounce ownership', async () => {
            const { sendSafeTx, delayModule, withdrawTokensModule } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(
                async () =>
                  await delayModule.populateTransaction.execTransactionFromModule(
                    withdrawTokensModule.address,
                    0,
                    withdrawTokensModule.interface.encodeFunctionData(
                      'renounceOwnership',
                    ),
                    0,
                  ),
                true,
              ),
            ).to.not.reverted;

            expect(await withdrawTokensModule.owner()).eq(
              constants.AddressZero,
            );
          });

          it('should fail: when caller is not the owner', async () => {
            const { sendSafeTx, withdrawTokensModule, regularAccounts } =
              await loadFixture(fixture);

            await expect(
              withdrawTokensModule
                .connect(regularAccounts[0])
                .renounceOwnership(),
            ).to.revertedWith('Ownable: caller is not the owner');
          });

          it('should fail: when calling directly without using execTransactionFromModule', async () => {
            const { sendSafeTx, withdrawTokensModule, guard } =
              await loadFixture(fixture);

            await expect(
              sendSafeTx(async () => ({
                to: withdrawTokensModule.address,
                data: withdrawTokensModule.interface.encodeFunctionData(
                  'renounceOwnership',
                ),
              })),
            ).to.be.revertedWithCustomError(guard, 'TargetNotDelayModifier');
          });
        });
      });
    });
  });
};

testSuite([
  {
    title: 'single signer',
    fixture: async () =>
      safeFixture().then((v) => ({
        ...v,
        safe: v.safeSingleSigner,
        delayModule: v.delayModuleSafeSingle,
        guard: v.guardSafeSingle,
        withdrawTokensModule: v.withdrawTokensModuleSafeSingle,
        sendSafeTx: v.sendSafeTxSingleSigner,
      })),
  },
]);
