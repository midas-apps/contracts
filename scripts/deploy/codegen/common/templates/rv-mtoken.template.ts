import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getRvMTokenContractFromTemplate = async (
  mToken: MTokenName,
  optionalParams?: Record<string, unknown>,
) => {
  const { vaultUseTokenLevelGreenList = false } = optionalParams || {};

  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rvMToken,
    content: `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.34;

    import "../../RedemptionVaultWithMToken.sol";
    import "./${contractNames.roles}.sol";

    /**
     * @title ${contractNames.rvMToken}
     * @notice Smart contract that handles ${
       contractNames.token
     } redemptions using mToken
     * liquid strategy. Upgrade-compatible replacement for
     * ${contractNames.rvSwapper}.
     * @author RedDuck Software
     */
    contract ${contractNames.rvMToken} is
        RedemptionVaultWithMToken,
        ${contractNames.roles}
    {
        /**
         * @dev leaving a storage gap for futures updates
         */
        uint256[50] private __gap;

        /**
         * @inheritdoc ManageableVault
         */
        function vaultRole() public pure override returns (bytes32) {
            return ${roles.redemptionVaultAdmin};
        }

        ${
          vaultUseTokenLevelGreenList
            ? `
        /**
         * @inheritdoc Greenlistable
         */
        function greenlistedRole() public pure override returns (bytes32) {
            return ${roles.greenlisted};
        }
        `
            : ''
        }
    }`,
  };
};
