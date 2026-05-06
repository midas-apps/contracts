import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getDataFeedContractFromTemplate = async (mToken: MTokenName) => {
  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );
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

  import "../../feeds/DataFeed.sol";
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
