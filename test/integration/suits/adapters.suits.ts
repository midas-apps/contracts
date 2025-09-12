import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increaseTo } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';

import { Network } from '../../../config';
import {
  BandStdChailinkAdapter,
  BeHypeChainlinkAdapter,
  ChainlinkAdapterBase,
  ERC4626ChainlinkAdapter,
  SyrupChainlinkAdapter,
  MantleLspStakingChainlinkAdapter,
  RsEthChainlinkAdapter,
  WrappedEEthChainlinkAdapter,
  WstEthChainlinkAdapter,
  StorkChainlinkAdapter,
  PythChainlinkAdapter,
} from '../../../typechain-types';

export type SyrupAdapterSuitsParams = {
  name: string;
  address: string;
  adapter: SyrupChainlinkAdapter;
};

export type BandAdapterSuitsParams = {
  id: string;
  ref: string;
  quote: string;
  base: string;
  adapter: BandStdChailinkAdapter;
};

export type BeHypeAdapterSuitsParams = {
  name: string;
  beHype: string;
  adapter: BeHypeChainlinkAdapter;
};

export type MantleLspStakingAdapterSuitsParams = {
  name: string;
  lspStaking: string;
  adapter: MantleLspStakingChainlinkAdapter;
};

export type RsEthAdapterSuitsParams = {
  name: string;
  rsEth: string;
  adapter: RsEthChainlinkAdapter;
};

export type WrappedEEthAdapterSuitsParams = {
  name: string;
  wrappedEEth: string;
  adapter: WrappedEEthChainlinkAdapter;
};

export type WstEthAdapterSuitsParams = {
  name: string;
  wstEth: string;
  adapter: WstEthChainlinkAdapter;
};

export type StorkAdapterSuitsParams = {
  name: string;
  stork: string;
  priceId: string;
  adapter: StorkChainlinkAdapter;
};

export type PythAdapterSuitsParams = {
  name: string;
  pyth: string;
  priceId: string;
  adapter: PythChainlinkAdapter;
};

export type ERC4626AdapterSuitsParams = {
  name: string;
  vault: string;
  adapter: ERC4626ChainlinkAdapter;
};

export const loadERC4626FixtureAdapter = async (
  tokenName: string,
  fixture: () => Promise<{ erc4626Adapters: ERC4626AdapterSuitsParams[] }>,
) => {
  const { erc4626Adapters, ...rest } = await loadFixture(fixture);
  return {
    erc4626Adapters,
    ...rest,
    erc4626Adapter: erc4626Adapters.find(
      (adapter) => adapter.name === tokenName,
    )!,
  };
};

export const loadSyrupFixtureAdapter = async (
  tokenName: string,
  fixture: () => Promise<{ syrupAdapters: SyrupAdapterSuitsParams[] }>,
) => {
  const { syrupAdapters, ...rest } = await loadFixture(fixture);
  return {
    syrupAdapters,
    ...rest,
    syrupAdapter: syrupAdapters.find((adapter) => adapter.name === tokenName)!,
  };
};

export const loadBandFixtureAdapter = async (
  id: string,
  fixture: () => Promise<{ bandAdapters: BandAdapterSuitsParams[] }>,
) => {
  const { bandAdapters, ...rest } = await loadFixture(fixture);
  return {
    bandAdapters,
    ...rest,
    bandAdapter: bandAdapters.find((adapter) => adapter.id === id)!,
  };
};

export const loadBeHypeFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{ beHypeAdapters: BeHypeAdapterSuitsParams[] }>,
) => {
  const { beHypeAdapters, ...rest } = await loadFixture(fixture);
  return {
    beHypeAdapters,
    ...rest,
    beHypeAdapter: beHypeAdapters.find((adapter) => adapter.name === name)!,
  };
};

export const loadMantleLspStakingFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{
    mantleLspStakingAdapters: MantleLspStakingAdapterSuitsParams[];
  }>,
) => {
  const { mantleLspStakingAdapters, ...rest } = await loadFixture(fixture);
  return {
    mantleLspStakingAdapters,
    ...rest,
    mantleLspStakingAdapter: mantleLspStakingAdapters.find(
      (adapter) => adapter.name === name,
    )!,
  };
};

export const loadRsEthFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{ rsEthAdapters: RsEthAdapterSuitsParams[] }>,
) => {
  const { rsEthAdapters, ...rest } = await loadFixture(fixture);
  return {
    rsEthAdapters,
    ...rest,
    rsEthAdapter: rsEthAdapters.find((adapter) => adapter.name === name)!,
  };
};

export const loadWrappedEEthFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{
    wrappedEEthAdapters: WrappedEEthAdapterSuitsParams[];
  }>,
) => {
  const { wrappedEEthAdapters, ...rest } = await loadFixture(fixture);
  return {
    wrappedEEthAdapters,
    ...rest,
    wrappedEEthAdapter: wrappedEEthAdapters.find(
      (adapter) => adapter.name === name,
    )!,
  };
};

export const loadWstEthFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{
    wstEthAdapters: WstEthAdapterSuitsParams[];
  }>,
) => {
  const { wstEthAdapters, ...rest } = await loadFixture(fixture);
  return {
    wstEthAdapters,
    ...rest,
    wstEthAdapter: wstEthAdapters.find((adapter) => adapter.name === name)!,
  };
};

export const loadStorkFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{
    storkAdapters: StorkAdapterSuitsParams[];
  }>,
) => {
  const { storkAdapters, ...rest } = await loadFixture(fixture);
  return {
    storkAdapters,
    ...rest,
    storkAdapter: storkAdapters.find((adapter) => adapter.name === name)!,
  };
};

export const loadPythFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{ pythAdapters: PythAdapterSuitsParams[] }>,
) => {
  const { pythAdapters, ...rest } = await loadFixture(fixture);
  return {
    pythAdapters,
    ...rest,
    pythAdapter: pythAdapters.find((adapter) => adapter.name === name)!,
  };
};

const baseAdapterSuits = (
  baseAdapterFixture: () => Promise<{
    adapter: ChainlinkAdapterBase;
  }>,
) => {
  return {
    decimals: () =>
      describe('decimals()', () => {
        it('should return 18', async function () {
          const { adapter } = await baseAdapterFixture();

          expect(await adapter.decimals()).eq(18);
        });
      }),
    description: () =>
      describe('description()', () => {
        it('should return a correct description', async function () {
          const { adapter } = await baseAdapterFixture();
          expect(await adapter.description()).eq(
            'A ChainlinkAggregatorV3 compatible adapter for ERC4626 vaults',
          );
        });
      }),

    getAnswer: () =>
      describe('getAnswer()', () => {
        it('should fail: not implemented', async function () {
          const { adapter } = await baseAdapterFixture();

          await expect(adapter.getAnswer(0)).revertedWith(
            'CAB: not implemented',
          );
        });
      }),

    getTimestamp: () =>
      describe('getTimestamp()', () => {
        it('should fail: not implemented', async function () {
          const { adapter } = await baseAdapterFixture();

          await expect(adapter.getTimestamp(0)).revertedWith(
            'CAB: not implemented',
          );
        });
      }),

    getRoundData: () =>
      describe('getRoundData()', () => {
        it('should fail: not implemented', async function () {
          const { adapter } = await baseAdapterFixture();

          await expect(adapter.getRoundData(0)).revertedWith(
            'CAB: not implemented',
          );
        });
      }),

    version: () =>
      describe('version()', () => {
        it('should return a correct version', async function () {
          const { adapter } = await baseAdapterFixture();

          expect(await adapter.version()).eq(1);
        });
      }),
    latestTimestamp: () =>
      describe('latestTimestamp()', () => {
        it('should return a correct latest timestamp', async function () {
          const { adapter } = await baseAdapterFixture();
          const nextTs =
            (await hre.ethers.provider.getBlock('latest')).timestamp + 1000;

          await increaseTo(nextTs);

          expect(await adapter.latestTimestamp()).eq(nextTs);
        });
      }),

    latestRound: () =>
      describe('latestRound()', () => {
        it('should return a correct latest round', async function () {
          const { adapter } = await baseAdapterFixture();
          expect(await adapter.latestRound()).eq(
            await adapter.latestTimestamp(),
          );
        });
      }),

    latestRoundData: () =>
      describe('latestRoundData()', () => {
        it('should return a correct latest data', async function () {
          const { adapter } = await baseAdapterFixture();

          const latestRoundData = await adapter.latestRoundData();
          expect(latestRoundData.roundId).eq(await adapter.latestRound());
          expect(latestRoundData.answer).eq(await adapter.latestAnswer());
          expect(latestRoundData.startedAt).eq(await adapter.latestTimestamp());
          expect(latestRoundData.updatedAt).eq(await adapter.latestTimestamp());
          expect(latestRoundData.answeredInRound).eq(
            await adapter.latestRound(),
          );
        });
      }),
  };
};

const erc4626AdapterSuits = (
  erc4626AdapterFixture: () => Promise<{
    adapter: ERC4626ChainlinkAdapter;
  }>,
) => {
  return {
    ...baseAdapterSuits(erc4626AdapterFixture),
    decimals: () =>
      describe('decimals()', () => {
        it('should return 18', async function () {
          const { adapter } = await erc4626AdapterFixture();
          const asset = await hre.ethers.getContractAt(
            'IERC20Metadata',
            await (
              await hre.ethers.getContractAt('IERC4626', await adapter.vault())
            ).asset(),
          );

          expect(await adapter.decimals()).eq(await asset.decimals());
        });
      }),
    vaultDecimals: () =>
      describe('vaultDecimals()', () => {
        it('should return vault.decimals()', async function () {
          const { adapter } = await erc4626AdapterFixture();
          expect(await adapter.vaultDecimals()).eq(
            // eslint-disable-next-line camelcase
            await (
              await hre.ethers.getContractAt(
                'IERC20Metadata',
                await adapter.vault(),
              )
            ).decimals(),
          );
        });
      }),
    description: () =>
      describe('description()', () => {
        it('should return a correct description', async function () {
          const { adapter } = await erc4626AdapterFixture();
          expect(await adapter.description()).eq(
            'A ChainlinkAggregatorV3 compatible adapter for ERC4626 vaults',
          );
        });
      }),
    latestAnswer: () =>
      describe('latestAnswer()', () => {
        it('should return a correct latest answer', async function () {
          const { adapter } = await erc4626AdapterFixture();

          const syrupToken = await hre.ethers.getContractAt(
            'IERC4626',
            await adapter.vault(),
          );

          expect(await adapter.latestAnswer()).eq(
            await syrupToken.convertToAssets(
              10 ** (await adapter.vaultDecimals()),
            ),
          );
        });
      }),
  };
};

const getAdapterSuits = <
  TAdapter,
  TFixture extends () => Promise<{ adapter: TAdapter }>,
  TFunction extends (adapterFixture: TFixture) => Record<string, () => void>,
>(
  adapterSuits: TFunction,
  adapterFixture: TFixture,
  excludedSuits: (keyof ReturnType<TFunction>)[] = [],
) => {
  const suits = adapterSuits(adapterFixture);
  const filteredSuits = Object.fromEntries(
    Object.entries(suits).filter(
      ([key]) => !excludedSuits.includes(key as keyof ReturnType<TFunction>),
    ),
  );
  for (const [_, value] of Object.entries(filteredSuits)) {
    value();
  }
};

export const syrupAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{ syrupAdapters: SyrupAdapterSuitsParams[] }>,
) => {
  describe(`Syrup Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`Syrup Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          erc4626AdapterSuits,
          () =>
            loadSyrupFixtureAdapter(tokenName, fixture).then(
              ({ syrupAdapter }) => ({
                adapter: syrupAdapter.adapter,
              }),
            ) as Promise<{ adapter: ERC4626ChainlinkAdapter }>,
          ['description', 'latestAnswer'],
        );

        it('deploy', async function () {
          const { syrupAdapter } = await loadSyrupFixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await syrupAdapter.adapter.vault()).eq(syrupAdapter.address);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { syrupAdapter } = await loadSyrupFixtureAdapter(
              tokenName,
              fixture,
            );

            expect(await syrupAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for Syrup tokens',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { syrupAdapter } = await loadSyrupFixtureAdapter(
              tokenName,
              fixture,
            );

            const syrupToken = await hre.ethers.getContractAt(
              'ISyrupToken',
              await syrupAdapter.adapter.vault(),
            );

            expect(await syrupAdapter.adapter.latestAnswer()).eq(
              await syrupToken.convertToExitAssets(
                10 ** (await syrupAdapter.adapter.vaultDecimals()),
              ),
            );
          });
        });
      });
    });
  });
};

export const beHypeAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{ beHypeAdapters: BeHypeAdapterSuitsParams[] }>,
) => {
  describe(`BeHYPE Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`BeHYPE Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadBeHypeFixtureAdapter(tokenName, fixture).then(
              ({ beHypeAdapter }) => ({
                adapter: beHypeAdapter.adapter,
              }),
            ) as Promise<{ adapter: BeHypeChainlinkAdapter }>,
          ['description'],
        );

        it('deploy', async function () {
          const { beHypeAdapter } = await loadBeHypeFixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await beHypeAdapter.adapter.beHype()).eq(beHypeAdapter.beHype);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { beHypeAdapter } = await loadBeHypeFixtureAdapter(
              tokenName,
              fixture,
            );

            expect(await beHypeAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for beHYPE',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { beHypeAdapter } = await loadBeHypeFixtureAdapter(
              tokenName,
              fixture,
            );

            const beHypeToken = await hre.ethers.getContractAt(
              'IBeHype',
              await beHypeAdapter.adapter.beHype(),
            );

            expect(await beHypeAdapter.adapter.latestAnswer()).eq(
              await beHypeToken.BeHYPEToHYPE(
                10 ** (await beHypeAdapter.adapter.decimals()),
              ),
            );
          });
        });
      });
    });
  });
};

export const mantleLspStakingAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    mantleLspStakingAdapters: MantleLspStakingAdapterSuitsParams[];
  }>,
) => {
  describe(`Mantle LSP Staking Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`Mantle LSP Staking Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadMantleLspStakingFixtureAdapter(tokenName, fixture).then(
              ({ mantleLspStakingAdapter }) => ({
                adapter: mantleLspStakingAdapter.adapter,
              }),
            ) as Promise<{ adapter: MantleLspStakingChainlinkAdapter }>,
          ['description'],
        );

        it('deploy', async function () {
          const { mantleLspStakingAdapter } =
            await loadMantleLspStakingFixtureAdapter(tokenName, fixture);
          expect(await mantleLspStakingAdapter.adapter.lspStaking()).eq(
            mantleLspStakingAdapter.lspStaking,
          );
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { mantleLspStakingAdapter } =
              await loadMantleLspStakingFixtureAdapter(tokenName, fixture);

            expect(await mantleLspStakingAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for Mantle LSP Staking',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { mantleLspStakingAdapter } =
              await loadMantleLspStakingFixtureAdapter(tokenName, fixture);

            const mantleLspStaking = await hre.ethers.getContractAt(
              'IMantleLspStaking',
              await mantleLspStakingAdapter.adapter.lspStaking(),
            );

            expect(await mantleLspStakingAdapter.adapter.latestAnswer()).eq(
              await mantleLspStaking.mETHToETH(
                parseUnits(
                  '1',
                  await mantleLspStakingAdapter.adapter.decimals(),
                ),
              ),
            );
          });
        });
      });
    });
  });
};

export const rsEthAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    rsEthAdapters: RsEthAdapterSuitsParams[];
  }>,
) => {
  describe(`rsETH Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`rsETH Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadRsEthFixtureAdapter(tokenName, fixture).then(
              ({ rsEthAdapter }) => ({
                adapter: rsEthAdapter.adapter,
              }),
            ) as Promise<{ adapter: RsEthChainlinkAdapter }>,
          ['description'],
        );

        it('deploy', async function () {
          const { rsEthAdapter } = await loadRsEthFixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await rsEthAdapter.adapter.rsEth()).eq(rsEthAdapter.rsEth);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { rsEthAdapter } = await loadRsEthFixtureAdapter(
              tokenName,
              fixture,
            );

            expect(await rsEthAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for rsETH',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { rsEthAdapter } = await loadRsEthFixtureAdapter(
              tokenName,
              fixture,
            );

            const rsEth = await hre.ethers.getContractAt(
              'IRsEth',
              await rsEthAdapter.adapter.rsEth(),
            );

            expect(await rsEthAdapter.adapter.latestAnswer()).eq(
              await rsEth.rsETHPrice(),
            );
          });
        });
      });
    });
  });
};

export const wrappedEEthAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    wrappedEEthAdapters: WrappedEEthAdapterSuitsParams[];
  }>,
) => {
  describe(`Wrapped EEth Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`Wrapped EEth Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadWrappedEEthFixtureAdapter(tokenName, fixture).then(
              ({ wrappedEEthAdapter }) => ({
                adapter: wrappedEEthAdapter.adapter,
              }),
            ) as Promise<{ adapter: WrappedEEthChainlinkAdapter }>,
          ['description'],
        );

        it('deploy', async function () {
          const { wrappedEEthAdapter } = await loadWrappedEEthFixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await wrappedEEthAdapter.adapter.wrappedEEth()).eq(
            wrappedEEthAdapter.wrappedEEth,
          );
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { wrappedEEthAdapter } = await loadWrappedEEthFixtureAdapter(
              tokenName,
              fixture,
            );

            expect(await wrappedEEthAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for Wrapped EEth',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { wrappedEEthAdapter } = await loadWrappedEEthFixtureAdapter(
              tokenName,
              fixture,
            );

            const wrappedEEth = await hre.ethers.getContractAt(
              'IWrappedEEth',
              await wrappedEEthAdapter.adapter.wrappedEEth(),
            );

            expect(await wrappedEEthAdapter.adapter.latestAnswer()).eq(
              await wrappedEEth.getRate(),
            );
          });
        });
      });
    });
  });
};

export const wstEthAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    wstEthAdapters: WstEthAdapterSuitsParams[];
  }>,
) => {
  describe(`wstETH Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`wstETH Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadWstEthFixtureAdapter(tokenName, fixture).then(
              ({ wstEthAdapter }) => ({
                adapter: wstEthAdapter.adapter,
              }),
            ) as Promise<{ adapter: WstEthChainlinkAdapter }>,
          ['description'],
        );

        it('deploy', async function () {
          const { wstEthAdapter } = await loadWstEthFixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await wstEthAdapter.adapter.wstEth()).eq(wstEthAdapter.wstEth);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { wstEthAdapter } = await loadWstEthFixtureAdapter(
              tokenName,
              fixture,
            );

            expect(await wstEthAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for Wrapped EEth',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { wstEthAdapter } = await loadWstEthFixtureAdapter(
              tokenName,
              fixture,
            );

            const wstEth = await hre.ethers.getContractAt(
              'IWstEth',
              await wstEthAdapter.adapter.wstEth(),
            );

            expect(await wstEthAdapter.adapter.latestAnswer()).eq(
              await wstEth.stEthPerToken(),
            );
          });
        });
      });
    });
  });
};

export const bandAdaptersSuits = (
  network: Network,
  ids: string[],
  fixture: () => Promise<{ bandAdapters: BandAdapterSuitsParams[] }>,
) => {
  describe(`Band Adapters on ${network}`, function () {
    ids.forEach((id) => {
      describe(`Band Adapter for ${id}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadBandFixtureAdapter(id, fixture).then(({ bandAdapter }) => ({
              adapter: bandAdapter.adapter,
            })) as Promise<{ adapter: BandStdChailinkAdapter }>,
          ['description', 'latestTimestamp', 'latestRoundData'],
        );

        it('deploy', async function () {
          const { bandAdapter } = await loadBandFixtureAdapter(id, fixture);
          expect(await bandAdapter.adapter.ref()).eq(bandAdapter.ref);
          expect(await bandAdapter.adapter.base()).eq(bandAdapter.base);
          expect(await bandAdapter.adapter.quote()).eq(bandAdapter.quote);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { bandAdapter } = await loadBandFixtureAdapter(id, fixture);

            expect(await bandAdapter.adapter.description()).eq(
              'A ChainlinkAggregatorV3 compatible adapter for Band protocol',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { bandAdapter } = await loadBandFixtureAdapter(id, fixture);

            const stdReference = await hre.ethers.getContractAt(
              'IStdReference',
              await bandAdapter.adapter.ref(),
            );

            expect(await bandAdapter.adapter.latestAnswer()).eq(
              await stdReference.getReferenceData(
                bandAdapter.base,
                bandAdapter.quote,
              ),
            );
          });
        });
      });
    });
  });
};

export const storkAdaptersSuits = (
  network: Network,
  ids: string[],
  fixture: () => Promise<{ storkAdapters: StorkAdapterSuitsParams[] }>,
) => {
  describe(`Stork Adapters on ${network}`, function () {
    ids.forEach((id) => {
      describe(`Stork Adapter for ${id}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadStorkFixtureAdapter(id, fixture).then(({ storkAdapter }) => ({
              adapter: storkAdapter.adapter,
            })) as Promise<{ adapter: BandStdChailinkAdapter }>,
          ['description', 'latestTimestamp'],
        );

        it('deploy', async function () {
          const { storkAdapter } = await loadStorkFixtureAdapter(id, fixture);
          expect(await storkAdapter.adapter.priceId()).eq(storkAdapter.priceId);
          expect(await storkAdapter.adapter.stork()).eq(storkAdapter.stork);
          expect(await storkAdapter.adapter.TIMESTAMP_DIVIDER()).eq(
            parseUnits('1', 9),
          );
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { storkAdapter } = await loadStorkFixtureAdapter(id, fixture);

            expect(await storkAdapter.adapter.description()).eq(
              'A port of a chainlink aggregator powered by Stork',
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { storkAdapter } = await loadStorkFixtureAdapter(id, fixture);

            const storkTemporalNumericValueUnsafeGetter =
              await hre.ethers.getContractAt(
                'IStorkTemporalNumericValueUnsafeGetter',
                await storkAdapter.adapter.stork(),
              );

            expect(await storkAdapter.adapter.latestAnswer()).eq(
              (
                await storkTemporalNumericValueUnsafeGetter.getTemporalNumericValueUnsafeV1(
                  storkAdapter.priceId,
                )
              ).quantizedValue,
            );
          });
        });

        describe('latestTimestamp()', () => {
          it('should return a correct timestamp', async function () {
            const { storkAdapter } = await loadStorkFixtureAdapter(id, fixture);

            const storkTemporalNumericValueUnsafeGetter =
              await hre.ethers.getContractAt(
                'IStorkTemporalNumericValueUnsafeGetter',
                await storkAdapter.adapter.stork(),
              );

            expect(await storkAdapter.adapter.latestTimestamp()).eq(
              (
                await storkTemporalNumericValueUnsafeGetter.getTemporalNumericValueUnsafeV1(
                  storkAdapter.priceId,
                )
              ).timestampNs.div(parseUnits('1', 9)),
            );
          });
        });
      });
    });
  });
};

export const pythAdaptersSuits = (
  network: Network,
  ids: string[],
  fixture: () => Promise<{ pythAdapters: PythAdapterSuitsParams[] }>,
) => {
  describe(`Pyth Adapters on ${network}`, function () {
    ids.forEach((id) => {
      describe(`Pyth Adapter for ${id}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadPythFixtureAdapter(id, fixture).then(({ pythAdapter }) => ({
              adapter: pythAdapter.adapter,
            })) as Promise<{ adapter: PythChainlinkAdapter }>,
          ['description', 'latestTimestamp', 'decimals'],
        );

        it('deploy', async function () {
          const { pythAdapter } = await loadPythFixtureAdapter(id, fixture);
          expect(await pythAdapter.adapter.priceId()).eq(pythAdapter.priceId);
          expect(await pythAdapter.adapter.pyth()).eq(pythAdapter.pyth);
        });

        describe('description()', () => {
          it('should return a correct description', async function () {
            const { pythAdapter } = await loadPythFixtureAdapter(id, fixture);

            expect(await pythAdapter.adapter.description()).eq(
              'A port of a chainlink aggregator powered by pyth network feeds',
            );
          });
        });

        describe('decimals()', () => {
          it('should return a correct decimals', async function () {
            const { pythAdapter } = await loadPythFixtureAdapter(id, fixture);

            const pyth = await hre.ethers.getContractAt(
              'IPyth',
              await pythAdapter.adapter.pyth(),
            );

            expect(await pythAdapter.adapter.decimals()).eq(
              (await pyth.getPriceUnsafe(pythAdapter.priceId)).expo * -1,
            );
          });
        });

        describe('latestAnswer()', () => {
          it('should return a correct answer', async function () {
            const { pythAdapter } = await loadPythFixtureAdapter(id, fixture);

            const pyth = await hre.ethers.getContractAt(
              'IPyth',
              await pythAdapter.adapter.pyth(),
            );

            expect(await pythAdapter.adapter.latestAnswer()).eq(
              (await pyth.getPriceUnsafe(pythAdapter.priceId)).price,
            );
          });
        });

        describe('latestTimestamp()', () => {
          it('should return a correct timestamp', async function () {
            const { pythAdapter } = await loadPythFixtureAdapter(id, fixture);

            const pyth = await hre.ethers.getContractAt(
              'IPyth',
              await pythAdapter.adapter.pyth(),
            );

            expect(await pythAdapter.adapter.latestTimestamp()).eq(
              (await pyth.getPriceUnsafe(pythAdapter.priceId)).publishTime,
            );
          });
        });
      });
    });
  });
};

export const erc4626AdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    erc4626Adapters: ERC4626AdapterSuitsParams[];
  }>,
) => {
  describe(`ERC4626 Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`ERC4626 Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          baseAdapterSuits,
          () =>
            loadERC4626FixtureAdapter(tokenName, fixture).then(
              ({ erc4626Adapter }) => ({
                adapter: erc4626Adapter.adapter,
              }),
            ) as Promise<{ adapter: ERC4626ChainlinkAdapter }>,
          [],
        );

        it('deploy', async function () {
          const { erc4626Adapter } = await loadERC4626FixtureAdapter(
            tokenName,
            fixture,
          );
          expect(await erc4626Adapter.adapter.vault()).eq(erc4626Adapter.vault);
        });
      });
    });
  });
};
