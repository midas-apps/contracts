// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {mTokenBase} from "./abstract/mTokenBase.sol";

/**
 * @title mToken
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mToken is mTokenBase {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @param _minterRole minter role
     * @param _burnerRole burner role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(
        bytes32 _contractAdminRole,
        bytes32 _minterRole,
        bytes32 _burnerRole
    ) mTokenBase(_contractAdminRole, _minterRole, _burnerRole) {}
}
