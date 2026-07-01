import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getRvMorphoContractFromTemplate = async (
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
    name: contractNames.rvMorpho,
    content: `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.9;

    import "../../RedemptionVaultWithMorpho.sol";
    import "./${contractNames.roles}.sol";

    /**
     * @title ${contractNames.rvMorpho}
     * @notice Smart contract that handles ${
       contractNames.token
     } redemptions via Morpho Vault
     * @author RedDuck Software
     */
    contract ${contractNames.rvMorpho} is
        RedemptionVaultWithMorpho,
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
