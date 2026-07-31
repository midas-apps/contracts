// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @notice Chainalysis sanctions oracle interface
 */
interface ISanctionsList {
    function isSanctioned(address addr) external view returns (bool);
}
