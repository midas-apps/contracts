import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getCustomAggregatorContractFromTemplate = async (
  mToken: MTokenName,
) => {
  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  if (!contractNames.customAggregator) {
    return undefined;
  }

  return {
    name: contractNames.customAggregator,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.customAggregator}
   * @notice AggregatorV3 compatible feed for ${contractNames.token},
   * where price is submitted manually by feed admins
   * @author RedDuck Software
   */
  contract ${contractNames.customAggregator} is
      CustomAggregatorV3CompatibleFeed,
      ${contractNames.roles}
  {
      /**
       * @dev leaving a storage gap for futures updates
       */
      uint256[50] private __gap;

      /**
       * @inheritdoc CustomAggregatorV3CompatibleFeed
       */
      function feedAdminRole() public pure override returns (bytes32) {
          return ${roles.customFeedAdmin};
      }
  }`,
  };
};
