import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getDvMorphoContractFromTemplate = async (mToken: MTokenName) => {
  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.dvMorpho,
    content: `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.9;

    import "../../DepositVaultWithMorpho.sol";
    import "./${contractNames.roles}.sol";

    /**
     * @title ${contractNames.dvMorpho}
     * @notice Smart contract that handles ${contractNames.token} minting with Morpho auto-invest
     * @author RedDuck Software
     */
    contract ${contractNames.dvMorpho} is
        DepositVaultWithMorpho,
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
    }`,
  };
};
