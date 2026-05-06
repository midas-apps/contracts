// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./LstHypeMidasAccessControlRoles.sol";

/**
 * @title LstHypeDataFeed
 * @notice DataFeed for lstHYPE product
 * @author RedDuck Software
 */
contract LstHypeDataFeed is DataFeed, LstHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
