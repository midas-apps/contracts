// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title IMToken
 * @author RedDuck Software
 */
interface IMToken is IERC20Upgradeable {
    /**
     * @param clawbackReceiver address to which clawback tokens will be sent
     */
    event ClawbackReceiverSet(address indexed clawbackReceiver);

    /**
     * @notice when new limit is invalid
     * @param newLimit new limit
     * @param existingLimit existing limit
     */
    error InvalidNewLimit(uint256 newLimit, uint256 existingLimit);

    /**
     * @notice mints mToken token `amount` to a given `to` address.
     * should be called only from permissioned actor
     * bypasses the timelock entirely
     * @param to addres to mint tokens to
     * @param amount amount to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice burns mToken token `amount` from a given `from` address.
     * should be called only from permissioned actor
     * bypasses the timelock entirely
     * @param from addres to burn tokens from
     * @param amount amount to burn
     */
    function burn(address from, uint256 amount) external;

    /**
     * @notice mints mToken token `amount` to a given `to` address,
     * requires the timelock to pass
     * should be called only from permissioned actor
     * @param to address to mint tokens to
     * @param amount amount to mint
     */
    function mintGoverned(address to, uint256 amount) external;

    /**
     * @notice burns mToken token `amount` from a given `from` address,
     * bypassing blacklist checks.
     * requires the timelock to pass
     * should be called only from permissioned actor
     * @param from address to burn tokens from
     * @param amount amount to burn
     */
    function burnGoverned(address from, uint256 amount) external;

    /**
     * @notice claws back tokens from a given address
     * @param amount amount to clawback
     * @param from address to clawback tokens from
     */
    function clawback(uint256 amount, address from) external;

    /**
     * @notice sets the address to which clawback tokens will be sent
     * @param clawbackReceiver address to which clawback tokens will be sent
     */
    function setClawbackReceiver(address clawbackReceiver) external;

    /**
     * @notice updates contract`s metadata.
     * should be called only from permissioned actor
     * @param key metadata map. key
     * @param data metadata map. value
     */
    function setMetadata(bytes32 key, bytes memory data) external;

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
