// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MTBillMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mBASIS contracts
 * @author RedDuck Software
 */
abstract contract MTBillMidasAccessControlRoles {
    /**
     * @notice actor that can manage MTBillCustomAggregatorFeed and MTBillDataFeed
     */
    bytes32 public constant M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
