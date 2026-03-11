import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getDvMTokenContractFromTemplate = async (
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
    name: contractNames.dvMToken,
    content: `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.9;

    import "../../DepositVaultWithMToken.sol";
    import "./${contractNames.roles}.sol";

    /**
     * @title ${contractNames.dvMToken}
     * @notice Smart contract that handles ${
       contractNames.token
     } minting with mToken auto-invest
     * @author RedDuck Software
     */
    contract ${contractNames.dvMToken} is
        DepositVaultWithMToken,
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
            return ${roles.depositVaultAdmin};
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
