// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "../../misc/layerzero/LzElevatedMinterBurner.sol";

/**
 * @title MTBillLzElevatedMinterBurner
 * @notice MinterBurner contract that controls access
 * for minting and burning of mTBILL in LayerZero flows
 * @author RedDuck Software
 */
contract MTBillLzElevatedMinterBurner is
    LzElevatedMinterBurner
    /**
     * @notice adapter role that can call mint and burn functions
     */
{
    bytes32 public constant M_TBILL_LZ_ADAPTER_ROLE =
        keccak256("M_TBILL_LZ_ADAPTER_ROLE");

    /**
     * @inheritdoc LzElevatedMinterBurner
     */
    function adapterRole() public pure override returns (bytes32) {
        return M_TBILL_LZ_ADAPTER_ROLE;
    }
}
