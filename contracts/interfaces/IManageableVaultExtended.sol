// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IManageableVault, TokenConfig} from "./IManageableVault.sol";

/**
 * @title IManageableVaultExtended
 * @author RedDuck Software
 * @dev extended IManageableVault interface to include methods from
 * default ManageableVault implementation
 */
interface IManageableVaultExtended is IManageableVault {
    /**
     * @notice returns the configuration for a given token
     * @param token the token to get the configuration for
     * @return the configuration for the token
     */
    function tokensConfig(address token)
        external
        view
        returns (TokenConfig memory);

    /**
     * @notice returns the waived fee restriction for a given account
     * @param account the account to get the waived fee restriction for
     * @return isWaived true if the account is waived from fee restriction, false otherwise
     */
    function waivedFeeRestriction(address account) external view returns (bool);

    /**
     * @notice returns the fee for instant operations
     * @return the instant fee in basis points
     */
    function instantFee() external view returns (uint256);
}
