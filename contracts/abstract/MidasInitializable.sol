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
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // TODO: uncomment it when we will have contract size buffer
    // /**
    //  * @dev returns the highest version that has been initialized
    //  * @return value the highest version that has been initialized
    //  */
    // function getInitializedVersion()
    //     external
    //     view
    //     returns (
    //         uint8 /* value */
    //     )
    // {
    //     return _getInitializedVersion();
    // }
}
