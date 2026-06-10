// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IMidasAccessControlManaged
 * @notice Interface for contracts that are managed by the MidasAccessControl
 * @author RedDuck Software
 */
interface IMidasAccessControlManaged {
    /**
     * @notice returns the role that can pause the contract
     * @return role role descriptor
     */
    function contractAdminRole() external view returns (bytes32);
}
