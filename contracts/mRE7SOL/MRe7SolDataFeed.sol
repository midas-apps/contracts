// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MRe7SolMidasAccessControlRoles.sol";

/**
 * @title MRe7SolDataFeed
 * @notice DataFeed for mRE7SOL product
 * @author RedDuck Software
 */
contract MRe7SolDataFeed is DataFeed, MRe7SolMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
