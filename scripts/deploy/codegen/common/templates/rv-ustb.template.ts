import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getRvUstbContractFromTemplate = async (mToken: MTokenName) => {
  const { getTokenContractNames } = await importWithoutCache(
    '../../../../../helpers/contracts',
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    '../../../../../helpers/roles',
  );
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rvUstb,
    content: `
    // SPDX-License-Identifier: MIT
    pragma solidity 0.8.9;

    import "../RedemptionVaultWithUSTB.sol";
    import "./${contractNames.roles}.sol";

    /**
     * @title ${contractNames.rvUstb}
     * @notice Smart contract that handles ${contractNames.token} redemptions
     * @author RedDuck Software
     */
    contract ${contractNames.rvUstb} is
        RedemptionVaultWithUSTB,
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
    }`,
  };
};
