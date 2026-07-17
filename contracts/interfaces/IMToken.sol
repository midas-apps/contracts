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
     * @param name new name
     * @param symbol new symbol
     */
    event SetNameSymbol(string indexed name, string indexed symbol);

    /**
     * @param isPermissioned if true then the token is permissioned
     */
    event SetIsPermissioned(bool indexed isPermissioned);

    /**
     * @param isMinHoldingBalanceEnforced if true then the token has a minimum holding balance enforced
     */
    event SetIsMinHoldingBalanceEnforced(
        bool indexed isMinHoldingBalanceEnforced
    );

    /**
     * @param key metadata key
     * @param data metadata data
     */
    event SetMetadata(bytes32 indexed key, bytes data);

    /**
     * @param from address to clawback tokens from
     * @param to address to clawback tokens to
     * @param amount amount to clawback
     */
    event Clawback(address indexed from, address indexed to, uint256 amount);

    /**
     * @notice when new limit is invalid
     * @param newLimit new limit
     * @param existingLimit existing limit
     */
    error InvalidNewLimit(uint256 newLimit, uint256 existingLimit);

    /**
     * @notice when the balance is not met
     * @param balance balance
     */
    error MinBalanceNotMet(uint256 balance);

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
     * @notice sets the name and symbol of the token
     * @param name_ new name
     * @param symbol_ new symbol
     */
    function setNameSymbol(string memory name_, string memory symbol_) external;

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

    /**
     * @notice removes mint rate limit config for a given window
     * @param window window duration in seconds
     */
    function removeMintRateLimitConfig(uint256 window) external;

    /**
     * @notice sets the permissioned status of the token
     * @param isPermissioned if true then the token is permissioned
     */
    function setIsPermissioned(bool isPermissioned) external;

    /**
     * @notice sets the min holding balance enforced status of the token
     * @param isMinHoldingBalanceEnforced if true then the token has a minimum holding balance enforced
     */
    function setMinHoldingBalanceEnforced(bool isMinHoldingBalanceEnforced)
        external;

    /**
     * @notice role that grants min balance exempt rights to the contract
     * @return role bytes32 role
     */
    function minBalanceExemptRole() external view returns (bytes32);

    /**
     * @notice sets the role that grants greenlisted rights to the contract
     * @return role bytes32 role
     */
    function greenlistedRole() external view returns (bytes32);
}
