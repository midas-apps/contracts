// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title MidasInitializable
 * @author RedDuck Software
 * @notice Base Initializable contract that implements constructor
 * that calls _disableInitializers() to prevent
 * initialization of implementation contract
 */
abstract contract MidasInitializable is Initializable {
    /**
     * @notice error when the address is invalid
     * @param addr address
     */
    error InvalidAddress(address addr);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev returns the highest version that has been initialized
     * @return value the highest version that has been initialized
     */
    function getInitializedVersion()
        external
        view
        returns (
            uint8 /* value */
        )
    {
        return _getInitializedVersion();
    }
}
