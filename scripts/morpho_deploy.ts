import { Contract } from 'ethers';
import hre from 'hardhat';

const abiFactory = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'caller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'oracle',
        type: 'address',
      },
    ],
    name: 'CreateMorphoChainlinkOracleV2',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'contract IERC4626', name: 'baseVault', type: 'address' },
      {
        internalType: 'uint256',
        name: 'baseVaultConversionSample',
        type: 'uint256',
      },
      {
        internalType: 'contract AggregatorV3Interface',
        name: 'baseFeed1',
        type: 'address',
      },
      {
        internalType: 'contract AggregatorV3Interface',
        name: 'baseFeed2',
        type: 'address',
      },
      { internalType: 'uint256', name: 'baseTokenDecimals', type: 'uint256' },
      {
        internalType: 'contract IERC4626',
        name: 'quoteVault',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'quoteVaultConversionSample',
        type: 'uint256',
      },
      {
        internalType: 'contract AggregatorV3Interface',
        name: 'quoteFeed1',
        type: 'address',
      },
      {
        internalType: 'contract AggregatorV3Interface',
        name: 'quoteFeed2',
        type: 'address',
      },
      { internalType: 'uint256', name: 'quoteTokenDecimals', type: 'uint256' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'createMorphoChainlinkOracleV2',
    outputs: [
      {
        internalType: 'contract MorphoChainlinkOracleV2',
        name: 'oracle',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'isMorphoChainlinkOracleV2',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];
const abiOracle = [
  {
    inputs: [],
    name: 'price',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const main = async () => {
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const factory = new Contract(
    '0x2dc205f24bcb6b311e5cdf0745b0741648aebd3d',
    abiFactory,
    owner,
  );

  const addr = await factory.callStatic.createMorphoChainlinkOracleV2(
    '0x0000000000000000000000000000000000000000',
    '1',
    '0x70E58b7A1c884fFFE7dbce5249337603a28b8422',
    '0x0000000000000000000000000000000000000000',
    '18',
    '0x0000000000000000000000000000000000000000',
    '1',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '6',
    '0x933745a0e99d336b63a30ec575aafc0ca3c591564fe16b100b71790ed3f61929',
  );

  console.log('address', addr);

  await (
    await factory.createMorphoChainlinkOracleV2(
      '0x0000000000000000000000000000000000000000',
      '1',
      '0x70E58b7A1c884fFFE7dbce5249337603a28b8422',
      '0x0000000000000000000000000000000000000000',
      '18',
      '0x0000000000000000000000000000000000000000',
      '1',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      '6',
      '0x933745a0e99d336b63a30ec575aafc0ca3c591564fe16b100b71790ed3f61929',
    )
  ).wait();

  const oracle = new Contract(addr, abiOracle, owner);

  console.log((await oracle.price()).toString());
};

main();
