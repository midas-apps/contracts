import { chainIds } from '../../../config';
import { DAY } from '../../../helpers/utils';
import { NetworkDeploymentConfig } from '../common/types';

export const networkDeploymentConfigs: NetworkDeploymentConfig = {
  [chainIds.sepolia]: {
    grantDefaultAdminRole: {},
    timelock: {
      minDelay: 100,
      proposer: '0x8bcc2DA99a25aE3582E50Aa0680C96D1610b8D73',
    },
  },
  [chainIds.katana]: {
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.hyperevm]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.etherlink]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.tac]: {
    grantDefaultAdminRole: {},
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0x88B577E8eB8a0BEFF49eb4fAB2a21210Af35264B',
    },
  },
  [chainIds.xrplevm]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0x5aacC1A5aE6085d222ec356FBae032B5081dAde7',
    },
  },
  [chainIds.zerog]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.plasma]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.bsc]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.scroll]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.monad]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.injective]: {
    grantDefaultAdminRole: {
      acAdminAddress: '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227',
    },
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xAD8bea0c137012021EEAF6486C42074701c5038E',
    },
  },
};
