import { MTokenName } from '../../../../../config';
import { getTokenContractNames } from '../../../../../helpers/contracts';
import { getRolesNamesForToken } from '../../../../../helpers/roles';

export const getRvUstbContractFromTemplate = (mToken: MTokenName) => {
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
