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
  [chainIds.base]: {
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.hyperevm]: {
    grantDefaultAdminRole: {},
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xF9e3295DBf89CF0Bf1344a3010CE96d026579BBb',
    },
  },
  [chainIds.main]: {
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0xB60842E9DaBCd1C52e354ac30E82a97661cB7E89',
    },
  },
  [chainIds.rootstock]: {
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0x77F186c27277B80660A942839bd38e0A05B5702D',
    },
  },
  [chainIds.oasis]: {
    timelock: {
      minDelay: 2 * DAY,
      proposer: '0x316017e4532A40ec8E67640F3B52115efB6B89A3',
    },
  },
  [chainIds.etherlink]: {
    grantDefaultAdminRole: {},
  },
  [chainIds.tac]: {
    grantDefaultAdminRole: {},
  },
};
