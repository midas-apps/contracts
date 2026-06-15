// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {MathUpgradeable as Math} from "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";

/**
 * @title RateLimitLibrary
 * @author RedDuck Software
 * @notice Multi-window linear-decay rate limiting (vault instant flows, mToken mint, etc.).
 */
library RateLimitLibrary {
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 private constant _MIN_WINDOW = 1 minutes;

    /**
     * @notice when window limit is exceeded
     * @param window window duration in seconds
     * @param remaining actual remaining amount
     * @param requested requested amount
     */
    error WindowLimitExceeded(
        uint256 window,
        uint256 remaining,
        uint256 requested
    );

    /**
     * @notice when window limit is unknown
     * @param window window duration in seconds
     */
    error UnknownWindowLimit(uint256 window);

    /**
     * @notice when window is too short
     * @param window window duration in seconds
     */
    error WindowTooShort(uint256 window);

    /**
     * @notice Emitted when a window limit is set or updated.
     * @param window window duration in seconds
     * @param limit max amount per window
     */
    event WindowLimitSet(uint256 window, uint256 limit);

    /**
     * @notice Emitted when a window limit is removed.
     * @param window window duration in seconds
     */
    event WindowLimitRemoved(uint256 window);

    /**
     * @notice Per-window rate limit (linear decay over `window` seconds).
     */
    struct WindowRateLimitConfig {
        /// @notice max amount per window
        uint256 limit;
        /// @notice amount currently counted against the limit
        uint256 amountInFlight;
        /// @notice last block timestamp when the limit was checked or updated
        uint256 lastUpdated;
        /// @notice window duration in seconds
        uint256 window;
    }

    /**
     * @notice Active windows and their configs (keyed by window duration).
     */
    struct WindowRateLimits {
        EnumerableSet.UintSet windows;
        mapping(uint256 => WindowRateLimitConfig) configs;
    }

    /**
     * @notice Snapshot for one window (view helper).
     */
    struct WindowRateLimitStatus {
        /// @notice decayed in-flight amount
        uint256 inFlight;
        /// @notice headroom under `limit`
        uint256 remaining;
        /// @notice last update timestamp
        uint256 lastUpdated;
        /// @notice window duration in seconds
        uint256 window;
        /// @notice max amount per window
        uint256 limit;
    }

    /**
     * @notice Returns a status row per configured window (enumeration order).
     * @param limits aggregated window state
     * @return statuses one entry per active window
     */
    function getWindowStatuses(WindowRateLimits storage limits)
        internal
        view
        returns (WindowRateLimitStatus[] memory statuses)
    {
        uint256 n = limits.windows.length();
        statuses = new WindowRateLimitStatus[](n);
        for (uint256 i = 0; i < n; ++i) {
            uint256 window = limits.windows.at(i);
            statuses[i] = _getWindowStatus(limits.configs[window]);
        }
    }

    /**
     * @notice Sets or updates the limit for a window (checkpoints first).
     * @param limits aggregated window state
     * @param window window duration in seconds
     * @param limit max amount per window
     * @return previousLimit previous limit
     */
    // TODO: rename to setMintLimit
    function setWindowLimit(
        WindowRateLimits storage limits,
        uint256 window,
        uint256 limit
    ) internal returns (uint256 previousLimit) {
        if (limits.windows.add(window)) {
            require(window >= _MIN_WINDOW, WindowTooShort(window));
        }

        WindowRateLimitConfig storage cfg = limits.configs[window];

        previousLimit = cfg.limit;

        cfg.window = window;
        cfg.limit = limit;

        _consumeWindowLimit(cfg, 0);

        emit WindowLimitSet(window, limit);
    }

    /**
     * @notice Removes a window and clears its config.
     * @param limits aggregated window state
     * @param window window duration in seconds
     */
    // TODO: rename to removeMintLimit
    function removeWindowLimit(WindowRateLimits storage limits, uint256 window)
        internal
    {
        require(limits.windows.remove(window), UnknownWindowLimit(window));
        delete limits.configs[window];
        emit WindowLimitRemoved(window);
    }

    /**
     * @notice Charges `amount` against every window (reverts if any lacks headroom).
     * @param limits aggregated window state
     * @param amount amount to charge
     */
    function consumeLimit(WindowRateLimits storage limits, uint256 amount)
        internal
    {
        uint256 n = limits.windows.length();
        for (uint256 i = 0; i < n; ++i) {
            uint256 window = limits.windows.at(i);
            _consumeWindowLimit(limits.configs[window], amount);
        }
    }

    /**
     * @notice Decayed in-flight and remaining headroom for one window.
     * @param cfg stored window config
     * @return status window status snapshot
     */
    function _getWindowStatus(WindowRateLimitConfig storage cfg)
        private
        view
        returns (WindowRateLimitStatus memory status)
    {
        (uint256 inFlight, uint256 remaining) = _availableCapacity(
            cfg.amountInFlight,
            cfg.lastUpdated,
            cfg.limit,
            cfg.window
        );

        status = WindowRateLimitStatus({
            inFlight: inFlight,
            remaining: remaining,
            lastUpdated: cfg.lastUpdated,
            window: cfg.window,
            limit: cfg.limit
        });
    }

    /**
     * @notice Linear decay (`limit * elapsed / window`, floored) then headroom.
     * @param amountInFlight stored in-flight amount
     * @param lastUpdated last update timestamp
     * @param limit max per window
     * @param window window duration in seconds
     * @return inFlight decayed in-flight
     * @return remaining capacity still available under `limit`
     */
    function _availableCapacity(
        uint256 amountInFlight,
        uint256 lastUpdated,
        uint256 limit,
        uint256 window
    ) private view returns (uint256 inFlight, uint256 remaining) {
        uint256 elapsed = block.timestamp - lastUpdated;

        uint256 decay = Math.mulDiv(
            limit,
            elapsed,
            window > 0 ? window : 1,
            Math.Rounding.Down
        );

        inFlight = amountInFlight <= decay ? 0 : amountInFlight - decay;

        remaining = limit <= inFlight ? 0 : limit - inFlight;
    }

    /**
     * @notice Checks headroom, then adds `amount` to in-flight and refreshes timestamp.
     * @param cfg stored window config
     * @param amount amount to add to in-flight (may be zero to checkpoint)
     */
    function _consumeWindowLimit(
        WindowRateLimitConfig storage cfg,
        uint256 amount
    ) private {
        (
            uint256 amountInFlight,
            uint256 lastUpdated,
            uint256 limit,
            uint256 window
        ) = (cfg.amountInFlight, cfg.lastUpdated, cfg.limit, cfg.window);

        (uint256 inFlight, uint256 remaining) = _availableCapacity(
            amountInFlight,
            lastUpdated,
            limit,
            window
        );

        require(
            amount <= remaining,
            WindowLimitExceeded(window, remaining, amount)
        );

        cfg.amountInFlight = inFlight + amount;
        cfg.lastUpdated = block.timestamp;
    }
}
