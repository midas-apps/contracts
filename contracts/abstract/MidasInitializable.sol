// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {StorageSlotUpgradeable as StorageSlot} from "@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol";

/**
 * @title MidasInitializable
 * @author RedDuck Software
 * @notice Base Initializable contract that implements constructor
 * that calls _disableInitializers() to prevent
 * initialization of implementation contract
 */
abstract contract MidasInitializable is Initializable {
    /**
     * @notice error when the sender is not the proxy admin
     */
    error SenderNotProxyAdmin();

    /**
     * @notice error when the address is invalid
     * @param addr address
     */
    error InvalidAddress(address addr);

    /**
     * @notice modifier to check if the sender is the proxy admin
     */
    modifier onlyProxyAdmin() {
        _onlyProxyAdmin();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice function to check if the sender is the proxy admin
     */
    function _onlyProxyAdmin() private view {
        address admin = StorageSlot
            .getAddressSlot(
                0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
            )
            .value;

        // during proxy deployment and initialize calls admin would be zero
        if (admin == address(0)) {
            return;
        }

        require(msg.sender == admin, SenderNotProxyAdmin());
    }
}
