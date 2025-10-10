// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "../../misc/layerzero/LzElevatedMinterBurner.sol";

/**
 * @title ObeatUsdLzElevatedMinterBurner
 * @notice MinterBurner contract that controls access
 * for minting and burning of obeatUSD in LayerZero flows
 * @author RedDuck Software
 */
contract ObeatUsdLzElevatedMinterBurner is LzElevatedMinterBurner {
    /**
     * @notice adapter role that can call mint and burn functions
     */
    bytes32 public constant OBEAT_USD_LZ_ADAPTER_ROLE =
        keccak256("OBEAT_USD_LZ_ADAPTER_ROLE");

    /**
     * @inheritdoc LzElevatedMinterBurner
     */
    function adapterRole() public pure override returns (bytes32) {
        return OBEAT_USD_LZ_ADAPTER_ROLE;
    }
}
