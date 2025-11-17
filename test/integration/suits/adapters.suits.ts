import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increaseTo } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';

import { Network } from '../../../config';
import {
  BandStdChailinkAdapter,
  ChainlinkAdapterBase,
  ERC4626ChainlinkAdapter,
  SyrupChainlinkAdapter,
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

export type SingleAddressAdapterSuitsParams = {
  name: string;
  adapter: Contract & ChainlinkAdapterBase;
  contract: Contract;
  fnToCall: string;
  storageVariable: string;
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

export const loadSingleAddressFixtureAdapter = async (
  name: string,
  fixture: () => Promise<{
    singleAddressAdapters: SingleAddressAdapterSuitsParams[];
  }>,
) => {
  const { singleAddressAdapters, ...rest } = await loadFixture(fixture);
  return {
    singleAddressAdapters,
    ...rest,
    singleAddressAdapter: singleAddressAdapters.find(
      (adapter) => adapter.name === name,
    )!,
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

const simpleAddressAdapterSuits = (
  adapterFixture: () => Promise<{
    adapter: Contract & ChainlinkAdapterBase;
    contract: Contract;
    fnToCall: string;
    storageVariable: string;
    name: string;
  }>,
) => {
  return {
    ...baseAdapterSuits(adapterFixture),
    deploy: () =>
      it('deploy', async function () {
        const { adapter, contract, storageVariable } = await adapterFixture();
        expect(await adapter[storageVariable]()).eq(contract.address);
      }),

    description: () =>
      describe('description()', () => {
        it('should return a correct description', async function () {
          const { adapter, name } = await adapterFixture();

          expect(await adapter.description()).eq(
            `A ChainlinkAggregatorV3 compatible adapter for ${name}`,
          );
        });
      }),
    latestAnswer: () =>
      describe('latestAnswer()', () => {
        it('should return a correct answer', async function () {
          const { adapter, contract, fnToCall, storageVariable } =
            await adapterFixture();

          const fnToCallFragment = Object.entries(
            contract.interface.functions,
          ).find((v) => v[0].startsWith(fnToCall))?.[1];

          if (
            fnToCallFragment &&
            (fnToCallFragment?.inputs?.length > 1 ||
              (fnToCallFragment?.inputs?.length === 1 &&
                !fnToCallFragment?.inputs?.[0]?.type.includes('int')))
          ) {
            throw new Error(`Unsupported function inputs`);
          }

          const fnToCallArgs =
            fnToCallFragment?.inputs?.length === 1
              ? [parseUnits('1', await adapter.decimals())]
              : [];

          expect(await adapter.latestAnswer()).eq(
            await contract[fnToCall](...fnToCallArgs),
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
                parseUnits('1', await syrupAdapter.adapter.vaultDecimals()),
              ),
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

export const singleAddressAdaptersSuits = (
  network: Network,
  tokenNames: string[],
  fixture: () => Promise<{
    singleAddressAdapters: SingleAddressAdapterSuitsParams[];
  }>,
) => {
  describe(`Single Address Adapters on ${network}`, function () {
    tokenNames.forEach((tokenName) => {
      describe(`Single Address Adapter for ${tokenName}`, () => {
        getAdapterSuits(
          simpleAddressAdapterSuits,
          () =>
            loadSingleAddressFixtureAdapter(tokenName, fixture).then(
              ({ singleAddressAdapter }) => ({
                adapter: singleAddressAdapter.adapter,
                contract: singleAddressAdapter.contract,
                fnToCall: singleAddressAdapter.fnToCall,
                storageVariable: singleAddressAdapter.storageVariable,
                name: singleAddressAdapter.name,
              }),
            ) as Promise<{
              adapter: Contract & ChainlinkAdapterBase;
              contract: Contract;
              fnToCall: string;
              storageVariable: string;
              name: string;
            }>,
          [],
        );
      });
    });
  });
};
