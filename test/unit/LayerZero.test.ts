import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';
import {
  loadFixture,
  setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants, ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import hre from 'hardhat';

import {
  // eslint-disable-next-line camelcase
  MidasLzOFTAdapter__factory,
  MidasVaultComposerSyncTester,
} from '../../typechain-types';
import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { deployProxyContract } from '../common/deploy.helpers';
import { layerZeroFixture } from '../common/fixtures';
import {
  depositAndSend,
  redeemAndSend,
  sendOft,
  setRateLimitConfig,
} from '../common/layer-zero.helpers';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  setInstantFeeTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';
import { mint } from '../common/mTBILL.helpers';

describe('LayerZero', function () {
  describe('MidasLzMintBurnOFTAdapter', () => {
    it('deployment', async () => {
      const fixture = await loadFixture(layerZeroFixture);
      const {
        oftAdapterA,
        oftAdapterB,
        mTBILL,
        mockEndpointA,
        mockEndpointB,
        owner,
      } = fixture;

      expect(await oftAdapterA.decimalConversionRate()).to.equal(
        parseUnits('1', 9),
      );
      expect(await oftAdapterB.decimalConversionRate()).to.equal(
        parseUnits('1', 9),
      );
      expect(await oftAdapterA.sharedDecimals()).to.equal(9);
      expect(await oftAdapterB.sharedDecimals()).to.equal(9);
      expect(await oftAdapterA.token()).to.equal(mTBILL.address);
      expect(await oftAdapterB.token()).to.equal(mTBILL.address);
      expect(await oftAdapterA.endpoint()).to.equal(mockEndpointA.address);
      expect(await oftAdapterB.endpoint()).to.equal(mockEndpointB.address);
      expect(await oftAdapterA.owner()).to.equal(owner.address);
      expect(await oftAdapterB.owner()).to.equal(owner.address);
      const rateLimitA = await oftAdapterA.getRateLimit(2);
      expect(rateLimitA.limit).to.equal(parseUnits('1000000000', 18));
      expect(rateLimitA.window).to.equal(60);
      const rateLimitB = await oftAdapterB.getRateLimit(1);
      expect(rateLimitB.limit).to.equal(parseUnits('1000000000', 18));
      expect(rateLimitB.window).to.equal(60);
    });

    describe('send()', () => {
      it('Send mTBILL from A to B', async () => {
        const fixture = await loadFixture(layerZeroFixture);

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('100', 18),
        );

        await sendOft(fixture, {});
      });

      it('Send mTBILL from B to A', async () => {
        const fixture = await loadFixture(layerZeroFixture);

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('100', 18),
        );

        await sendOft(fixture, {});
      });

      it('when having dust on transfer because of decimal convertion (A to B)', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, eidB, regularAccounts } = fixture;

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('1000000', 18),
        );

        await sendOft(fixture, {
          amount: 10.1234567891234,
          recipient: regularAccounts[0].address,
        });
      });

      it('should fail: from A to B when A adapter does not have burner role', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterA, eidB, accessControl, roles } = fixture;

        await accessControl.revokeRole(
          roles.tokenRoles.mTBILL.burner,
          oftAdapterA.address,
        );

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('1000000', 18),
        );

        await sendOft(
          fixture,
          { amount: 1000000 },
          { revertMessage: 'WMAC: hasnt role' },
        );
      });

      it('should fail: from A to B when B adapter does not have minter role', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, oftAdapterA, eidB, accessControl, roles } =
          fixture;

        await accessControl.revokeRole(
          roles.tokenRoles.mTBILL.minter,
          oftAdapterB.address,
        );

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('1000000', 18),
        );

        await sendOft(fixture, { amount: 100 }, { revertOnDst: true });
      });

      it('should fail: send mTBILL from A to B with rate limit exceeded', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterA, eidB } = fixture;

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('1000000000', 18),
        );

        await setRateLimitConfig(
          { oftAdapter: oftAdapterA, owner: fixture.owner },
          { dstEid: eidB, limit: parseUnits('100'), window: 60 },
        );

        await sendOft(
          fixture,
          { amount: 101 },
          {
            revertWithCustomError: {
              contract: oftAdapterA,
              error: 'RateLimitExceeded',
            },
          },
        );
      });
    });

    describe('mint()', () => {
      it('should mint tokens when caller is the contract itself', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        // await impersonateAccount(oftAdapterB.address);
        const impersonatedContract = await hre.ethers.getImpersonatedSigner(
          oftAdapterB.address,
        );

        await setBalance(oftAdapterB.address, parseUnits('100', 18));

        await expect(
          oftAdapterB
            .connect(impersonatedContract)
            .mint(regularAccounts[0].address, parseUnits('100', 18)),
        ).not.reverted;
      });

      it('should fail: when caller is not the contract itself', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.mint(regularAccounts[0].address, parseUnits('100', 18)),
        ).revertedWithCustomError(oftAdapterB, 'SenderNotThis');
      });
    });

    describe('burn()', () => {
      it('should burn tokens when caller is the contract itself', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        // await impersonateAccount(oftAdapterB.address);
        const impersonatedContract = await hre.ethers.getImpersonatedSigner(
          oftAdapterB.address,
        );

        await setBalance(oftAdapterB.address, parseUnits('100', 18));

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          regularAccounts[0].address,
          parseUnits('100', 18),
        );

        await expect(
          oftAdapterB
            .connect(impersonatedContract)
            .burn(regularAccounts[0].address, parseUnits('100', 18)),
        ).not.reverted;
      });

      it('should fail: when caller is not the contract itself', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.burn(regularAccounts[0].address, parseUnits('100', 18)),
        ).revertedWithCustomError(oftAdapterB, 'SenderNotThis');
      });
    });

    describe('setRateLimits()', () => {
      it('should set rate limits', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, eidB } = fixture;

        await oftAdapterB.setRateLimits([
          { dstEid: eidB, limit: parseUnits('100'), window: 60 },
        ]);
      });

      it('should fail: when call from non-owner', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.connect(regularAccounts[0]).setRateLimits([]),
        ).revertedWith('Ownable: caller is not the owner');
      });

      it('when call with empty rate limit configs without changing anything', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(oftAdapterB.setRateLimits([])).not.reverted;
        const rateLimit = await oftAdapterB.getRateLimit(1);
        expect(rateLimit.limit).to.equal(parseUnits('1000000000', 18));
        expect(rateLimit.window).to.equal(60);
      });
    });
  });

  describe('MidasLzOFT', () => {
    it('deployment', async () => {
      const fixture = await loadFixture(layerZeroFixture);
      const { pTokenLzOft, owner, mockEndpointB } = fixture;

      expect(await pTokenLzOft.decimals()).to.equal(18);
      expect(await pTokenLzOft.sharedDecimals()).to.equal(9);
      expect(await pTokenLzOft.decimalConversionRate()).to.equal(
        parseUnits('1', 9),
      );
      expect(await pTokenLzOft.name()).to.equal('LZ Payment Token OFT');
      expect(await pTokenLzOft.symbol()).to.equal('PTOFT');
      expect(await pTokenLzOft.owner()).to.equal(owner.address);
      expect(await pTokenLzOft.endpoint()).to.equal(mockEndpointB.address);
      expect(await pTokenLzOft.token()).to.equal(pTokenLzOft.address);
    });
  });

  describe('MidasLzOFTAdapter', () => {
    it('deployment', async () => {
      const fixture = await loadFixture(layerZeroFixture);
      const { pTokenLzOftAdapter, owner, mockEndpointA, stableCoins } = fixture;

      expect(await pTokenLzOftAdapter.sharedDecimals()).to.equal(9);
      expect(await pTokenLzOftAdapter.decimalConversionRate()).to.equal(
        parseUnits('1', 9),
      );
      expect(await pTokenLzOftAdapter.owner()).to.equal(owner.address);
      expect(await pTokenLzOftAdapter.endpoint()).to.equal(
        mockEndpointA.address,
      );
      expect(await pTokenLzOftAdapter.token()).to.equal(
        stableCoins.usdt.address,
      );
    });
  });

  describe('MidasVaultComposerSync', () => {
    it('deployment', async () => {
      const fixture = await loadFixture(layerZeroFixture);
      const {
        composer,
        depositVault,
        redemptionVault,
        pTokenLzOftAdapter,
        oftAdapterA,
        mTokenToUsdDataFeed,
        stableCoins,
        mTBILL,
      } = fixture;

      expect(await composer.mTokenDataFeed()).to.equal(
        mTokenToUsdDataFeed.address,
      );
      expect(await composer.depositVault()).to.equal(depositVault.address);
      expect(await composer.redemptionVault()).to.equal(
        redemptionVault.address,
      );
      expect(await composer.paymentTokenOft()).to.equal(
        pTokenLzOftAdapter.address,
      );
      expect(await composer.mTokenOft()).to.equal(oftAdapterA.address);
      expect(await composer.mTokenErc20()).to.equal(mTBILL.address);
      expect(await composer.paymentTokenErc20()).to.equal(
        stableCoins.usdt.address,
      );

      expect(await composer.paymentTokenDecimals()).to.equal(
        await stableCoins.usdt.decimals(),
      );
      expect(
        await stableCoins.usdt.allowance(
          composer.address,
          pTokenLzOftAdapter.address,
        ),
      ).to.equal(constants.MaxUint256);
      expect(
        await stableCoins.usdt.allowance(
          composer.address,
          depositVault.address,
        ),
      ).to.equal(constants.MaxUint256);
      expect(
        await mTBILL.allowance(composer.address, redemptionVault.address),
      ).to.equal(constants.MaxUint256);
    });

    describe('depositAndSend', () => {
      it('should deposit and send mTBILL from A to A', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, depositVault, stableCoins, owner, dataFeed } =
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
        await approveBase18(fixture.owner, stableCoins.usdt, composer, 100);

        await depositAndSend(fixture, {
          amount: 100,
        });
      });

      it('should deposit and send mTBILL from A to B', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, depositVault, stableCoins, owner, dataFeed } =
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
        await approveBase18(fixture.owner, stableCoins.usdt, composer, 100);

        await depositAndSend(fixture, {
          amount: 100,
          direction: 'A_TO_B',
        });
      });

      it('should fail: deposit and send mTBILL from A to B when B does not have minter role', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          composer,
          depositVault,
          stableCoins,
          owner,
          dataFeed,
          accessControl,
          roles,
          oftAdapterB,
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
        await approveBase18(fixture.owner, stableCoins.usdt, composer, 100);
        await accessControl.revokeRole(
          roles.tokenRoles.mTBILL.minter,
          oftAdapterB.address,
        );

        await depositAndSend(
          fixture,
          {
            amount: 100,
            direction: 'A_TO_B',
          },
          {
            revertOnDst: true,
          },
        );
      });
    });

    describe('redeemAndSend', () => {
      it('should redeem and send USDT from A to A', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          composer,
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
        await approveBase18(fixture.owner, mTBILL, composer, 100);
        await setInstantFeeTest({ vault: redemptionVault, owner }, 0);

        await redeemAndSend(fixture, {
          amount: 100,
        });
      });

      it('should deposit and send mTBILL from A to B', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          composer,
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
        await approveBase18(fixture.owner, mTBILL, composer, 100);

        await redeemAndSend(fixture, {
          amount: 100,
          direction: 'A_TO_B',
        });
      });
    });

    describe('handleCompose()', () => {
      it('should fail: when caller is not self', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, owner, oftAdapterA } = fixture;

        await expect(
          composer.handleCompose(owner.address, constants.HashZero, '0x', 0),
        ).revertedWithCustomError(composer, 'OnlySelf');
      });
    });

    describe('lzCompose()', () => {
      it.skip('when OFT transfer triggers redeem from B to A', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          composer,
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

        await redeemAndSend(fixture, {
          amount: 100,
          direction: 'B_TO_A',
        });
      });

      it('should fail: when caller is not the endpoint', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, owner } = fixture;

        await expect(
          composer.lzCompose(
            owner.address,
            constants.HashZero,
            '0x',
            owner.address,
            '0x',
          ),
        ).revertedWithCustomError(composer, 'OnlyEndpoint');
      });

      it('should fail: when caller is not the pToken OFT or mToken OFT', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, owner, mockEndpointA } = fixture;

        const endpointSigner = await hre.ethers.getImpersonatedSigner(
          mockEndpointA.address,
        );
        await setBalance(endpointSigner.address, parseUnits('100', 18));

        await expect(
          composer
            .connect(endpointSigner)
            .lzCompose(
              owner.address,
              constants.HashZero,
              '0x',
              owner.address,
              '0x',
            ),
        ).revertedWithCustomError(composer, 'OnlyValidComposeCaller');
      });

      it('should fail: when insufficient native error is throwns', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, owner, mockEndpointA, oftAdapterA } = fixture;

        const endpointSigner = await hre.ethers.getImpersonatedSigner(
          mockEndpointA.address,
        );
        await setBalance(endpointSigner.address, parseUnits('100', 18));

        const composeMsg = ethers.utils.defaultAbiCoder.encode(
          [
            'tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)',
            'uint256',
          ],
          [
            [
              1,
              addressToBytes32(owner.address),
              parseUnits('100'),
              0,
              Options.newOptions().toHex(),
              '0x',
              '0x',
            ],
            0,
          ],
        );

        await composer.setHandleComposeType(1);
        await expect(
          composer
            .connect(endpointSigner)
            .lzCompose(
              oftAdapterA.address,
              constants.HashZero,
              composeMsg,
              owner.address,
              '0x',
            ),
        ).revertedWithCustomError(composer, 'InsufficientMsgValue');
      });

      it('when error is thrown, should perform the refund', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { composer, owner, mockEndpointA, oftAdapterA, mTBILL } = fixture;

        const endpointSigner = await hre.ethers.getImpersonatedSigner(
          mockEndpointA.address,
        );
        await setBalance(endpointSigner.address, parseUnits('100', 18));
        await mintToken(mTBILL, composer, 100);

        const composeMsg = ethers.utils.defaultAbiCoder.encode(
          [
            'tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)',
            'uint256',
          ],
          [
            [
              1,
              addressToBytes32(owner.address),
              parseUnits('100'),
              0,
              Options.newOptions().toHex(),
              '0x',
              '0x',
            ],
            0,
          ],
        );

        const composeMsgHeader = ethers.utils.solidityPack(
          ['uint64', 'uint32', 'uint256', 'bytes32'],
          [1, 2, parseUnits('100'), addressToBytes32(owner.address)],
        );

        const composeMsgWithHeader = composeMsgHeader.concat(
          composeMsg.replace('0x', ''),
        );

        await composer.setHandleComposeType(2);

        const lzParams = {
          amountLD: parseUnits('100'),
          composeMsg: '0x',
          dstEid: 2,
          extraOptions: Options.newOptions().toHex(),
          minAmountLD: 0,
          oftCmd: '0x',
          to: addressToBytes32(owner.address),
        };

        // Fetching the native fee for the token send operation
        const { nativeFee } = await oftAdapterA
          .quoteSend(lzParams, false)
          .catch((_) => {
            return { nativeFee: parseUnits('0.1', 18), lzTokenFee: 0 };
          });

        await composer
          .connect(endpointSigner)
          .lzCompose(
            oftAdapterA.address,
            constants.HashZero,
            composeMsgWithHeader,
            owner.address,
            '0x',
            {
              value: nativeFee,
            },
          );
        expect(await mTBILL.balanceOf(owner.address)).eq(parseUnits('100'));
      });
    });

    describe('_balanceOfThis', () => {
      it('balance of this when mToken address passed', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { mTBILL, composer } = fixture;

        await mintToken(mTBILL, composer, 100);

        expect(await composer.balanceOfThisPublic(mTBILL.address)).eq(
          parseUnits('100'),
        );
      });

      it('balance of this when stable address passed', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { stableCoins, composer } = fixture;

        await mintToken(stableCoins.usdt, composer, 100);

        expect(await composer.balanceOfThisPublic(stableCoins.usdt.address)).eq(
          parseUnits('100'),
        );
      });
    });

    describe('_previewDeposit', () => {
      it('when all fees are 0, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
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

        expect(await composer.previewDepositPublic(parseUnits('100', 18))).eq(
          parseUnits('50', 18),
        );
      });

      it('when all fees are 0, mToken price is 2 and stable price is 1.02 and isStable = false', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          false,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewDepositPublic(parseUnits('100', 18))).eq(
          parseUnits('51', 18),
        );
      });

      it('when instant fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewDepositPublic(parseUnits('100', 18))).eq(
          parseUnits('49.5', 18),
        );
      });

      it('when instant fee is 1%, token fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdt,
          dataFeed.address,
          100,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewDepositPublic(parseUnits('100', 18))).eq(
          parseUnits('49', 18),
        );
      });

      it('when composer is fee waived, instant fee is 1%, token fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: depositVault },
          stableCoins.usdt,
          dataFeed.address,
          100,
          true,
        );

        await setInstantFeeTest({ owner, vault: depositVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await addWaivedFeeAccountTest(
          { vault: depositVault, owner },
          composer.address,
        );

        expect(await composer.previewDepositPublic(parseUnits('100', 18))).eq(
          parseUnits('50', 18),
        );
      });
    });

    describe('_previewRedeem', () => {
      it('when all fees are 0, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
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

        expect(await composer.previewRedeemPublic(parseUnits('50', 18))).eq(
          parseUnits('100', 18),
        );
      });

      it('when all fees are 0, mToken price is 2 and stable price is 1.02 and isStable = false', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          false,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 0);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewRedeemPublic(parseUnits('51', 18))).eq(
          parseUnits('100', 18),
        );
      });

      it('when instant fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdt,
          dataFeed.address,
          0,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewRedeemPublic(parseUnits('50', 18))).eq(
          parseUnits('99', 18),
        );
      });

      it('when instant fee is 1%, token fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdt,
          dataFeed.address,
          100,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);

        expect(await composer.previewRedeemPublic(parseUnits('50', 18))).eq(
          parseUnits('98', 18),
        );
      });

      it('when composer is fee waived, instant fee is 1%, token fee is 1%, mToken price is 2 and stable price is 1.02 and isStable = true', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
        } = fixture;

        await addPaymentTokenTest(
          { owner, vault: redemptionVault },
          stableCoins.usdt,
          dataFeed.address,
          100,
          true,
        );

        await setInstantFeeTest({ owner, vault: redemptionVault }, 100);
        await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
        await addWaivedFeeAccountTest(
          { vault: redemptionVault, owner },
          composer.address,
        );

        expect(await composer.previewRedeemPublic(parseUnits('50', 18))).eq(
          parseUnits('100', 18),
        );
      });
    });

    describe('_send', () => {
      it('when send to the same eid', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { owner, composer, mTBILL, oftAdapterA } = fixture;

        await mintToken(mTBILL, composer.address, 100);

        // Fetching the native fee for the token send operation
        await expect(
          composer.sendPublic(
            oftAdapterA.address,
            {
              amountLD: parseUnits('100'),
              composeMsg: '0x',
              dstEid: 1,
              extraOptions: Options.newOptions().toHex(),
              minAmountLD: 0,
              oftCmd: '0x',
              to: addressToBytes32(owner.address),
            },
            owner.address,
          ),
        ).not.reverted;

        const balanceAfter = await mTBILL.balanceOf(owner.address);
        expect(balanceAfter).to.equal(parseUnits('100'));
      });

      it('when send to the different eid', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const { owner, composer, mTBILL, oftAdapterA, oftAdapterB } = fixture;

        await mintToken(mTBILL, composer.address, 100);

        const lzParams = {
          amountLD: parseUnits('100'),
          composeMsg: '0x',
          dstEid: 2,
          extraOptions: Options.newOptions()
            .addExecutorLzReceiveOption(200_000, 0)
            .toHex(),
          minAmountLD: 0,
          oftCmd: '0x',
          to: addressToBytes32(owner.address),
        };
        // Fetching the native fee for the token send operation
        const { nativeFee } = await oftAdapterA
          .quoteSend(lzParams, false)
          .catch((_) => {
            return { nativeFee: parseUnits('0.1', 18), lzTokenFee: 0 };
          });

        // Fetching the native fee for the token send operation
        await expect(
          composer.sendPublic(oftAdapterA.address, lzParams, owner.address, {
            value: nativeFee,
          }),
        ).emit(
          oftAdapterB,
          oftAdapterB.interface.events[
            'OFTReceived(bytes32,uint32,address,uint256)'
          ].name,
        ).not.reverted;

        const balanceAfter = await mTBILL.balanceOf(owner.address);
        expect(balanceAfter).to.equal(parseUnits('100'));
      });
    });

    describe('_redeem', () => {
      it('redeem and check that received amount is correct', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
          mTBILL,
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
        await mintToken(mTBILL, composer, 100);
        await mintToken(stableCoins.usdt, redemptionVault, 200);

        expect(
          await composer.callStatic.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100'));

        await expect(
          composer.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        ).not.reverted;
      });

      it('redeem and check that received amount is correct when ptoken decimals is not 18', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          oftAdapterA,
          dataFeed,
          mockEndpointA,
          mockedAggregatorMToken,
          owner,
          mTBILL,
        } = fixture;

        const pTokenLzOftAdapter = await new MidasLzOFTAdapter__factory(
          owner,
        ).deploy(
          stableCoins.usdc.address,
          8,
          mockEndpointA.address,
          owner.address,
        );

        const composer =
          await deployProxyContract<MidasVaultComposerSyncTester>(
            'MidasVaultComposerSyncTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              pTokenLzOftAdapter.address,
              oftAdapterA.address,
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
        await mintToken(mTBILL, composer, 100);
        await mintToken(stableCoins.usdc, redemptionVault, 200);

        expect(
          await composer.callStatic.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100', 8));

        await expect(
          composer.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        ).not.reverted;
      });

      it('redeem and check that passed params to underlying redeemInstant are correct', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          oftAdapterA,
          dataFeed,
          mockEndpointA,
          mockedAggregatorMToken,
          owner,
          mTBILL,
        } = fixture;

        const pTokenLzOftAdapter = await new MidasLzOFTAdapter__factory(
          owner,
        ).deploy(
          stableCoins.usdc.address,
          8,
          mockEndpointA.address,
          owner.address,
        );

        const composer =
          await deployProxyContract<MidasVaultComposerSyncTester>(
            'MidasVaultComposerSyncTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              pTokenLzOftAdapter.address,
              oftAdapterA.address,
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
        await mintToken(mTBILL, composer, 100);
        await mintToken(stableCoins.usdc, redemptionVault, 200);

        expect(
          await composer.callStatic.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        ).eq(parseUnits('100', 8));

        await expect(
          composer.redeemPublic(
            addressToBytes32(composer.address),
            parseUnits('50'),
            0,
          ),
        )
          .emit(
            redemptionVault,
            redemptionVault.interface.events[
              'RedeemInstant(address,address,uint256,uint256,uint256)'
            ].name,
          )
          .withArgs(
            composer.address,
            stableCoins.usdc.address,
            parseUnits('50'),
            0,
            parseUnits('100'),
          );
      });
    });

    describe('_deposit', () => {
      it('deposit and check that received amount is correct', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          depositVault,
          dataFeed,
          mockedAggregatorMToken,
          owner,
          composer,
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
        await mintToken(stableCoins.usdt, composer, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await composer.callStatic.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100'),
            0,
          ),
        ).eq(parseUnits('50'));

        await expect(
          composer.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100'),
            0,
          ),
        ).not.reverted;
      });

      it('deposit and check that received amount is correct when ptoken decimals is not 18', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          oftAdapterA,
          dataFeed,
          mockEndpointA,
          mockedAggregatorMToken,
          owner,
          mTBILL,
        } = fixture;

        const pTokenLzOftAdapter = await new MidasLzOFTAdapter__factory(
          owner,
        ).deploy(
          stableCoins.usdc.address,
          8,
          mockEndpointA.address,
          owner.address,
        );

        const composer =
          await deployProxyContract<MidasVaultComposerSyncTester>(
            'MidasVaultComposerSyncTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              pTokenLzOftAdapter.address,
              oftAdapterA.address,
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
        await mintToken(stableCoins.usdc, composer, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await composer.callStatic.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100', 8),
            0,
          ),
        ).eq(parseUnits('50'));

        await expect(
          composer.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100', 8),
            0,
          ),
        ).not.reverted;
      });

      it('deposit and check that passed params to underlying depositInstant are correct', async () => {
        const fixture = await loadFixture(layerZeroFixture);
        const {
          stableCoins,
          redemptionVault,
          depositVault,
          oftAdapterA,
          dataFeed,
          mockEndpointA,
          mockedAggregatorMToken,
          owner,
          mTBILL,
        } = fixture;

        const pTokenLzOftAdapter = await new MidasLzOFTAdapter__factory(
          owner,
        ).deploy(
          stableCoins.usdc.address,
          8,
          mockEndpointA.address,
          owner.address,
        );

        const composer =
          await deployProxyContract<MidasVaultComposerSyncTester>(
            'MidasVaultComposerSyncTester',
            undefined,
            undefined,
            [
              depositVault.address,
              redemptionVault.address,
              pTokenLzOftAdapter.address,
              oftAdapterA.address,
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
        await mintToken(stableCoins.usdc, composer, 200);
        await setMinAmountTest({ vault: depositVault, owner }, 0);

        expect(
          await composer.callStatic.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100', 8),
            0,
          ),
        ).eq(parseUnits('50'));

        await expect(
          composer.depositPublic(
            addressToBytes32(composer.address),
            parseUnits('100', 8),
            0,
          ),
        )
          .emit(
            depositVault,
            depositVault.interface.events[
              'DepositInstant(address,address,uint256,uint256,uint256,uint256,bytes32)'
            ].name,
          )
          .withArgs(
            composer.address,
            stableCoins.usdc.address,
            parseUnits('100'),
            parseUnits('100'),
            0,
            parseUnits('50'),
            constants.HashZero,
          );
      });
    });
  });
});
