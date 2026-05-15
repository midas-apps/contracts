// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {RateLimitLibrary} from "../libraries/RateLimitLibrary.sol";

/**
 * @notice Exposes {RateLimitLibrary} internals for unit tests.
 */
contract RateLimitLibraryTester {
    using EnumerableSet for EnumerableSet.UintSet;

    RateLimitLibrary.WindowRateLimits private _limits;

    function setWindowLimitPublic(uint256 window, uint256 limit)
        external
        returns (uint256 previousLimit)
    {
        return RateLimitLibrary.setWindowLimit(_limits, window, limit);
    }

    function removeWindowLimitPublic(uint256 window) external {
        RateLimitLibrary.removeWindowLimit(_limits, window);
    }

    function consumeLimitPublic(uint256 amount) external {
        RateLimitLibrary.consumeLimit(_limits, amount);
    }

    function getWindowStatusesPublic()
        external
        view
        returns (RateLimitLibrary.WindowRateLimitStatus[] memory)
    {
        return RateLimitLibrary.getWindowStatuses(_limits);
    }

    function getWindowConfigPublic(uint256 window)
        external
        view
        returns (
            uint256 limit,
            uint256 amountInFlight,
            uint256 lastUpdated,
            uint256 windowDuration
        )
    {
        RateLimitLibrary.WindowRateLimitConfig storage cfg = _limits.configs[
            window
        ];
        return (cfg.limit, cfg.amountInFlight, cfg.lastUpdated, cfg.window);
    }

    function windowCountPublic() external view returns (uint256) {
        return _limits.windows.length();
    }

    function hasWindowPublic(uint256 window) external view returns (bool) {
        return _limits.windows.contains(window);
    }
}
