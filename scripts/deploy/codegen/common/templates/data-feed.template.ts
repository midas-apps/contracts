import { MTokenName } from '../../../../../config';
import { getTokenContractNames } from '../../../../../helpers/contracts';
import { getRolesNamesForToken } from '../../../../../helpers/roles';

export const getDataFeedContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);
  if (!contractNames.dataFeed) {
    return undefined;
  }

  return {
    name: contractNames.dataFeed,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../feeds/DataFeed.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.dataFeed}
   * @notice DataFeed for ${contractNames.token} product
   * @author RedDuck Software
   */
  contract ${contractNames.dataFeed} is DataFeed, ${contractNames.roles} {
      /**
       * @dev leaving a storage gap for futures updates
       */
      uint256[50] private __gap;

      /**
       * @inheritdoc DataFeed
       */
      function feedAdminRole() public pure override returns (bytes32) {
          return ${roles.customFeedAdmin};
      }
  }`,
  };
};
