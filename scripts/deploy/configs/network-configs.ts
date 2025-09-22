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
  },
};
