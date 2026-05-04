// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @notice mToken rate limit configuration
 */
struct MTokenRateLimitConfig {
    /// @notice limit amount per window
    uint256 limit;
    /// @notice limitUsed amount used within the last epoch
    uint256 limitUsed;
    /// @notice last epoch id
    uint256 lastEpoch;
}

/**
 * @title IMToken
 * @author RedDuck Software
 */
interface IMToken is IERC20Upgradeable {
    error InvalidNewLimit(uint256 newLimit, uint256 existingLimit);
    error MintRateLimitExceeded(
        uint256 window,
        uint256 limitUsed,
        uint256 limit
    );

    /**
     * @param caller function caller (msg.sender)
     * @param window window duration in seconds
     * @param limit limit amount per window
     */
    event SetMintRateLimitConfig(
        address indexed caller,
        uint256 indexed window,
        uint256 limit
    );

    /**
     * @notice mints mToken token `amount` to a given `to` address.
     * should be called only from permissioned actor
     * @param to addres to mint tokens to
     * @param amount amount to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice burns mToken token `amount` to a given `to` address.
     * should be called only from permissioned actor
     * @param from addres to burn tokens from
     * @param amount amount to burn
     */
    function burn(address from, uint256 amount) external;

    /**
     * @notice updates contract`s metadata.
     * should be called only from permissioned actor
     * @param key metadata map. key
     * @param data metadata map. value
     */
    function setMetadata(bytes32 key, bytes memory data) external;

    /**
     * @notice puts mToken token on pause.
     * should be called only from permissioned actor
     */
    function pause() external;

    /**
     * @notice puts mToken token on pause.
     * should be called only from permissioned actor
     */
    function unpause() external;

    /**
     * @notice increases mint rate limit for a given window
     * @param window window duration in seconds
     * @param newLimit limit amount per window
     */
    function increaseMintRateLimit(uint256 window, uint256 newLimit) external;

    /**
     * @notice decreases mint rate limit for a given window
     * @param window window duration in seconds
     * @param newLimit limit amount per window
     */
    function decreaseMintRateLimit(uint256 window, uint256 newLimit) external;
}
