import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  acErrors,
  blackList,
  greenList,
  unBlackList,
  unGreenList,
} from './common/ac.helpers';
import { approveBase18, mintToken } from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import {
  depositTest,
  fulfillManualDepositTest,
  getOutputAmountWithFeeTest,
  setMinAmountToDepositTest,
} from './common/deposit-vault.helpers';
import { defaultDeploy } from './common/fixtures';
import {
  addPaymentTokenTest,
  removePaymentTokenTest,
  withdrawTest,
} from './common/manageable-vault.helpers';

import { DepositVault, ERC20Mock } from '../typechain-types';

describe('DepositVault', function () {
  it('deployment', async () => {
    const { depositVault, stUSD, dataFeed, eurToUsdDataFeed, roles } =
      await loadFixture(defaultDeploy);

    expect(await depositVault.stUSD()).eq(stUSD.address);

    expect(await depositVault.etfDataFeed()).eq(dataFeed.address);

    expect(await depositVault.eurUsdDataFeed()).eq(eurToUsdDataFeed.address);

    expect(await depositVault.PERCENTAGE_BPS()).eq('100');

    expect(await depositVault.minAmountToDepositInEuro()).eq('0');

    expect(await depositVault.vaultRole()).eq(roles.depositVaultAdmin);

    expect(await depositVault.MANUAL_FULLFILMENT_TOKEN()).eq(
      ethers.constants.AddressZero,
    );
  });

  it('initialize()', async () => {
    const { depositVault } = await loadFixture(defaultDeploy);

    await expect(
      depositVault.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
      ),
    ).revertedWith('Initializable: contract is already initialized');
  });

  describe('setMinAmountToDeposit()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setMinAmountToDepositTest({ depositVault, owner }, 1.1, {
        from: regularAccounts[0],
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { owner, depositVault } = await loadFixture(defaultDeploy);
      await setMinAmountToDepositTest({ depositVault, owner }, 1.1);
    });
  });

  describe('setFee(),getFee()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(
        depositVault.connect(regularAccounts[0]).setFee(1),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      await expect(depositVault.setFee(1)).to.emit(
        depositVault,
        depositVault.interface.events['SetFee(address,uint256)'].name,
      ).not.reverted;
      expect(await depositVault.getFee()).eq(1);
    });
  });

  describe('addPaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token eq to address(0)', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: 'MV: invalid token' },
      );
    });

    it('should fail: when token is already added', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        {
          revertMessage: 'MV: already added',
        },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
      );
    });
  });

  describe('removePaymentToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when token is not exists', async () => {
      const { owner, depositVault, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
        { revertMessage: 'MV: not exists' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role and add 3 options on a row', async () => {
      const { depositVault, regularAccounts, owner, stableCoins } =
        await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
      );

      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai.address,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc.address,
      );
      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt.address,
      );

      await removePaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt.address,
        { revertMessage: 'MV: not exists' },
      );
    });
  });
  describe('withdrawToken()', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );
      await withdrawTest(
        { vault: depositVault, owner },
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: when there is no token in vault', async () => {
      const { owner, depositVault, regularAccounts, stableCoins } =
        await loadFixture(defaultDeploy);
      await withdrawTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
        { revertMessage: 'ERC20: transfer amount exceeds balance' },
      );
    });

    it('call from address with DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, stableCoins, owner } =
        await loadFixture(defaultDeploy);
      await mintToken(stableCoins.dai, depositVault, 1);
      await withdrawTest(
        { vault: depositVault, owner },
        stableCoins.dai,
        1,
        regularAccounts[0],
      );
    });
  });

  describe('usdToEuro()', () => {
    it('EUR price is 1$, minAmountToDepositInEuro is 100000 EUR, should return 100000 USD', async () => {
      const {
        depositVault,
        mockedAggregatorEur: mockedAggregator,
        owner,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      expect(await depositVault.minAmountToDepositInUsd()).eq(
        parseUnits('100000'),
      );
    });

    it('EUR price is 1.1$, minAmountToDepositInEuro is 100000 EUR, should return 110000 USD', async () => {
      const {
        depositVault,
        mockedAggregatorEur: mockedAggregator,
        owner,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator }, 1.1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);
      expect(await depositVault.minAmountToDepositInUsd()).eq(
        parseUnits('110000'),
      );
    });
  });

  // describe('usdToEuro()', () => {
  //   it('EUR price is 1$, amount is 1 USD, should return 1 EUR', async () => {

  //     const {
  //       depositVault,
  //       mockedAggregatorEur: mockedAggregator,
  //     } = await loadFixture(defaultDeploy);
  //     await setRoundData({mockedAggregator}, 1);
  //     expect(await depositVault.usdToEuro(parseUnits('1'))).eq(parseUnits('1'));
  //   })

  //   it('EUR price is 1.078$, amount is 2 USD, should return 1.8552875695732838 EUR', async () => {
  //     const {
  //       depositVault,
  //       mockedAggregatorEur: mockedAggregator,
  //     } = await loadFixture(defaultDeploy);
  //     await setRoundData({mockedAggregator}, 1.078);
  //     expect(await depositVault.usdToEuro(parseUnits('2'))).approximately(parseUnits('1.8552875695732838'), parseUnits('0.00001'));
  //   })

  //   it('EUR price is 0.91$, amount is 2 USD, should return 2.197802198 EUR', async () => {
  //     const {
  //       depositVault,
  //       mockedAggregatorEur: mockedAggregator,
  //     } = await loadFixture(defaultDeploy);
  //     await setRoundData({mockedAggregator}, 0.91);
  //     expect(await depositVault.usdToEuro(parseUnits('2'))).approximately(parseUnits('2.197802198'), parseUnits('0.00001'));
  //   })

  // })
  describe('getOutputAmountWithFee()', () => {
    const test = ({
      priceN,
      amountN,
      feeN,
      expectedValue,
    }: {
      priceN: number;
      amountN: number;
      feeN: number;
      expectedValue: number;
    }) => {
      it(`price is ${priceN}$, fee is ${feeN}%, amount is ${amountN}$ return value should be ${expectedValue} stUSD`, async () => {
        const {
          depositVault,
          mockedAggregator,
          regularAccounts,
          owner,
          stUSD,
          stableCoins,
        } = await loadFixture(defaultDeploy);

        await getOutputAmountWithFeeTest(
          { depositVault, mockedAggregator },
          {
            priceN,
            amountN,
            feeN,
          },
        );
      });
    };

    test({ priceN: 5.1, feeN: 1, amountN: 100, expectedValue: 19.41 });
    test({ priceN: 1, feeN: 0.01, amountN: 50, expectedValue: 9.8 });
    test({ priceN: 5, feeN: 0, amountN: 100, expectedValue: 20 });
    test({ priceN: 0, feeN: 1, amountN: 100, expectedValue: 0 });
    test({ priceN: 1, feeN: 1, amountN: 0, expectedValue: 0 });
  });

  describe('deposit()', () => {
    it('should fail: call from address without GREENLISTED_ROLE role', async () => {
      const { depositVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 0, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
        from: regularAccounts[0],
      });
    });

    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 0, {
        revertMessage: 'MV: token not exists',
      });
    });

    it('should fail: when trying to deposit 0 amount', async () => {
      const {
        owner,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 0, {
        revertMessage: 'DV: invalid amount',
      });
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await mintToken(stableCoins.dai, owner, 10);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 1, {
        revertMessage: 'ERC20: insufficient allowance',
      });
    });

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await approveBase18(owner, stableCoins.dai, depositVault, 10);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 1, {
        revertMessage: 'ERC20: transfer amount exceeds balance',
      });
    });

    it('should fail: output amount is 0', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await mintToken(stableCoins.dai, owner, 10);
      await approveBase18(owner, stableCoins.dai, depositVault, 10);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 0);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 1, {
        revertMessage: 'DV: invalid amount out',
      });
    });

    it('should fail: deposit 100 DAI, then remove user from green list and try to deposit again', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 5);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 100);

      await unGreenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 100, {
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call for amount < minAmountToDepositTest', async () => {
      const {
        depositVault,
        accessControl,
        mockedAggregator,
        mockedAggregatorEur,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorEur }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);

      await depositTest(
        { depositVault, owner, stUSD },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'DV: usd amount < min',
        },
      );
    });

    it('deposit 100 DAI, when price is 5$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );
      await mintToken(stableCoins.dai, owner, 100);
      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 5);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 100);
    });

    it('call for amount == minAmountToDepositTest', async () => {
      const {
        depositVault,
        accessControl,
        mockedAggregator,
        mockedAggregatorEur,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_000);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_000);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorEur }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);

      await depositTest(
        { depositVault, owner, stUSD },
        stableCoins.dai,
        100_000,
      );
    });

    it('call for amount == minAmountToDepositTest+1, then deposit with amount 1', async () => {
      const {
        depositVault,
        accessControl,
        mockedAggregator,
        mockedAggregatorEur,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 4);

      await mintToken(stableCoins.dai, owner, 100_002);
      await approveBase18(owner, stableCoins.dai, depositVault, 100_002);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );

      await setRoundData({ mockedAggregator: mockedAggregatorEur }, 1);
      await setMinAmountToDepositTest({ depositVault, owner }, 100_000);

      await depositTest(
        { depositVault, owner, stUSD },
        stableCoins.dai,
        100_001,
      );
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 1);
    });

    it('deposit 100 DAI, when price is 5$, 25 USDC when price is 5.1$, 14 USDT when price is 5.4$', async () => {
      const {
        owner,
        mockedAggregator,
        depositVault,
        accessControl,
        regularAccounts,
        stableCoins,
        stUSD,
      } = await loadFixture(defaultDeploy);
      await greenList(
        { accessControl, greenlistable: depositVault, owner },
        owner,
      );

      await mintToken(stableCoins.dai, owner, 100);
      await mintToken(stableCoins.usdc, owner, 25);
      await mintToken(stableCoins.usdt, owner, 14);

      await approveBase18(owner, stableCoins.dai, depositVault, 100);
      await approveBase18(owner, stableCoins.usdc, depositVault, 25);
      await approveBase18(owner, stableCoins.usdt, depositVault, 14);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdc,
      );
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.usdt,
      );

      await setRoundData({ mockedAggregator }, 5);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.dai, 100);

      await setRoundData({ mockedAggregator }, 5.1);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.usdc, 25);

      await setRoundData({ mockedAggregator }, 5.4);
      await depositTest({ depositVault, owner, stUSD }, stableCoins.usdt, 14);
    });
  });

  describe('fulfillManualDeposit(address,uint256)', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      )['fulfillManualDeposit(address,uint256)'](regularAccounts[0], 0);
    });

    it('should fail: call for amountUsdIn = 0', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: 'DV: invalid amount' },
      )['fulfillManualDeposit(address,uint256)'](regularAccounts[0], 0);
    });

    it('should fail: call for amountStUsdOut = 0', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 0);
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: 'DV: invalid amount out' },
      )['fulfillManualDeposit(address,uint256)'](regularAccounts[0], 10);
    });

    it('call for amount <= minAmountToDepositTest', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 5);
      await setMinAmountToDepositTest({ depositVault, owner }, 11);
      await fulfillManualDepositTest({ depositVault, owner, stUSD })[
        'fulfillManualDeposit(address,uint256)'
      ](regularAccounts[0], 10);
    });
  });

  describe('fulfillManualDeposit(address,uint256,uint256)', () => {
    it('should fail: call from address without DEPOSIT_VAULT_ADMIN_ROLE role', async () => {
      const { depositVault, regularAccounts, owner, stUSD, stableCoins } =
        await loadFixture(defaultDeploy);
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      )['fulfillManualDeposit(address,uint256,uint256)'](
        regularAccounts[0],
        0,
        0,
      );
    });

    it('should fail: call for amountUsdIn = 0', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: 'DV: invalid amount' },
      )['fulfillManualDeposit(address,uint256,uint256)'](
        regularAccounts[0],
        0,
        0,
      );
    });

    it('should fail: call for amountStUsdOut = 0', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 0);
      await fulfillManualDepositTest(
        { depositVault, owner, stUSD },

        { revertMessage: 'DV: invalid amount out' },
      )['fulfillManualDeposit(address,uint256,uint256)'](
        regularAccounts[0],
        10,
        0,
      );
    });

    it('call for amount <= minAmountToDepositTest', async () => {
      const {
        depositVault,
        regularAccounts,
        mockedAggregator,
        owner,
        stUSD,
        stableCoins,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: depositVault, owner },
        stableCoins.dai,
      );
      await setRoundData({ mockedAggregator }, 5);
      await setMinAmountToDepositTest({ depositVault, owner }, 11);
      await fulfillManualDepositTest({ depositVault, owner, stUSD })[
        'fulfillManualDeposit(address,uint256,uint256)'
      ](regularAccounts[0], 10, 1);
    });
  });
});