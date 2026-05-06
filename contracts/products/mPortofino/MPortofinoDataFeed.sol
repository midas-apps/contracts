// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MPortofinoMidasAccessControlRoles.sol";

/**
 * @title MPortofinoDataFeed
 * @notice DataFeed for mPortofino product
 * @author RedDuck Software
 */
contract MPortofinoDataFeed is DataFeed, MPortofinoMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
