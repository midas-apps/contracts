import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import hre from 'hardhat';

import { approveBase18, mintToken } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { layerZeroFixture } from '../common/fixtures';
import {
  depositAndSend,
  redeemAndSend,
  sendOft,
  setRateLimitConfig,
} from '../common/layer-zero.helpers';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  setMinAmountTest,
} from '../common/manageable-vault.helpers';
import { mint } from '../common/mTBILL.helpers';

describe.only('LayerZero', function () {
  describe('MidasLzMintBurnOFTAdapter', () => {
    it('deployment', async () => {
      const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('100', 18),
        );

        await sendOft(fixture, {});
      });

      it('Send mTBILL from B to A', async () => {
        const fixture = await layerZeroFixture();

        await mint(
          { owner: fixture.owner, tokenContract: fixture.mTBILL },
          fixture.owner,
          parseUnits('100', 18),
        );

        await sendOft(fixture, {});
      });

      it('when having dust on transfer because of decimal convertion (A to B)', async () => {
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.mint(regularAccounts[0].address, parseUnits('100', 18)),
        ).revertedWithCustomError(oftAdapterB, 'SenderNotThis');
      });
    });

    describe('burn()', () => {
      it('should burn tokens when caller is the contract itself', async () => {
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.burn(regularAccounts[0].address, parseUnits('100', 18)),
        ).revertedWithCustomError(oftAdapterB, 'SenderNotThis');
      });
    });

    describe('setRateLimits()', () => {
      it('should set rate limits', async () => {
        const fixture = await layerZeroFixture();
        const { oftAdapterB, eidB } = fixture;

        await oftAdapterB.setRateLimits([
          { dstEid: eidB, limit: parseUnits('100'), window: 60 },
        ]);
      });

      it('should fail: when call from non-owner', async () => {
        const fixture = await layerZeroFixture();
        const { oftAdapterB, regularAccounts } = fixture;

        await expect(
          oftAdapterB.connect(regularAccounts[0]).setRateLimits([]),
        ).revertedWith('Ownable: caller is not the owner');
      });

      it('when call with empty rate limit configs without changing anything', async () => {
        const fixture = await layerZeroFixture();
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
      const fixture = await layerZeroFixture();
      const { pTokenLzOft, owner, mockEndpointB } = fixture;

      expect(await pTokenLzOft.decimals()).to.equal(18);
      expect(await pTokenLzOft.sharedDecimals()).to.equal(6);
      expect(await pTokenLzOft.decimalConversionRate()).to.equal(
        parseUnits('1', 12),
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
      const fixture = await layerZeroFixture();
      const { pTokenLzOftAdapter, owner, mockEndpointA, stableCoins } = fixture;

      expect(await pTokenLzOftAdapter.sharedDecimals()).to.equal(6);
      expect(await pTokenLzOftAdapter.decimalConversionRate()).to.equal(
        parseUnits('1', 12),
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
      const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
        const { composer, owner, oftAdapterA } = fixture;

        await expect(
          composer.handleCompose(owner.address, constants.HashZero, '0x', 0),
        ).revertedWithCustomError(composer, 'OnlySelf');
      });
    });

    describe('lzCompose()', () => {
      it.skip('when OFT transfer triggers redeem from B to A', async () => {
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
        const fixture = await layerZeroFixture();
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
    });
  });
});
