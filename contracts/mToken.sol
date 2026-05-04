// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./access/Blacklistable.sol";
import "./interfaces/IMToken.sol";

/**
 * @title mToken
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mToken is ERC20PausableUpgradeable, Blacklistable, IMToken {
    using EnumerableSet for EnumerableSet.UintSet;

    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @notice set of mint rate limit config windows
     */
    EnumerableSet.UintSet private _mintRateLimitWindows;

    /**
     * @notice mapping, window duration in seconds => limit config
     */
    mapping(uint256 => MTokenRateLimitConfig) public mintRateLimitConfigs;

    /**
     * @dev leaving a storage gap for futures updates
     */
    // FIXME: update gap
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external virtual initializer {
        __WithMidasAccessControl_init(_accessControl);
        (string memory _name, string memory _symbol) = _getNameSymbol();
        __ERC20_init(_name, _symbol);
    }

    /**
     * @inheritdoc IMToken
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(_minterRole(), msg.sender)
    {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burn(address from, uint256 amount)
        external
        onlyRole(_burnerRole(), msg.sender)
    {
        _burn(from, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function pause() external override onlyRole(_pauserRole(), msg.sender) {
        _pause();
    }

    /**
     * @inheritdoc IMToken
     */
    function unpause() external override onlyRole(_pauserRole(), msg.sender) {
        _unpause();
    }

    /**
     * @inheritdoc IMToken
     */
    function setMetadata(bytes32 key, bytes memory data)
        external
        onlyRole(DEFAULT_ADMIN_ROLE, msg.sender)
    {
        metadata[key] = data;
    }

    // FIXME: update role
    /**
     * @inheritdoc IMToken
     */
    function increaseMintRateLimit(uint256 window, uint256 newLimit)
        external
        onlyRole(DEFAULT_ADMIN_ROLE, msg.sender)
    {
        _setMintRateLimitConfig(window, newLimit, true);
    }

    // FIXME: update role
    /**
     * @inheritdoc IMToken
     */
    function decreaseMintRateLimit(uint256 window, uint256 newLimit)
        external
        onlyRole(DEFAULT_ADMIN_ROLE, msg.sender)
    {
        _setMintRateLimitConfig(window, newLimit, false);
    }

    /**
     * @dev set mint rate limit config
     * @param window window duration in seconds
     * @param limit limit amount per window
     * @param increaseOnly whether to only increase the limit or decrease it
     */
    function _setMintRateLimitConfig(
        uint256 window,
        uint256 limit,
        bool increaseOnly
    ) private {
        // add window to set if not exists
        _mintRateLimitWindows.add(window);

        MTokenRateLimitConfig memory existingConfig = mintRateLimitConfigs[
            window
        ];

        bool isNewLimitValid = increaseOnly
            ? limit > existingConfig.limit
            : limit < existingConfig.limit;

        require(isNewLimitValid, InvalidNewLimit(limit, existingConfig.limit));

        mintRateLimitConfigs[window] = MTokenRateLimitConfig({
            limit: limit,
            limitUsed: existingConfig.limitUsed,
            lastEpoch: existingConfig.lastEpoch
        });

        emit SetMintRateLimitConfig(msg.sender, window, limit);
    }

    /**
     * @dev check if operation exceed mint rate limit and update limit data
     * @param amount mint amount (decimals 18)
     */
    function _requireAndUpdateMintRateLimit(uint256 amount) internal {
        for (uint256 i = 0; i < _mintRateLimitWindows.length(); ++i) {
            uint256 window = _mintRateLimitWindows.at(i);
            MTokenRateLimitConfig memory config = mintRateLimitConfigs[window];
            uint256 currentEpochIndex = block.timestamp / window;

            if (currentEpochIndex != config.lastEpoch) {
                config.limitUsed = 0;
                config.lastEpoch = currentEpochIndex;
            }

            config.limitUsed += amount;

            require(
                config.limitUsed <= config.limit,
                MintRateLimitExceeded(window, config.limitUsed, config.limit)
            );

            mintRateLimitConfigs[window] = config;
        }
    }

    /**
     * @dev overrides _beforeTokenTransfer function to ban
     * blaclisted users from using the token functions
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20PausableUpgradeable) {
        if (to != address(0)) {
            _onlyNotBlacklisted(from);
            _onlyNotBlacklisted(to);
        }

        // if minting, check and update mint rate limit
        if (from == address(0)) {
            _requireAndUpdateMintRateLimit(amount);
        }

        ERC20PausableUpgradeable._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev returns name and symbol of the token
     * @return name of the token
     * @return symbol of the token
     */
    function _getNameSymbol()
        internal
        virtual
        returns (string memory, string memory);

    /**
     * @dev AC role, owner of which can mint mToken token
     */
    function _minterRole() internal pure virtual returns (bytes32);

    /**
     * @dev AC role, owner of which can burn mToken token
     */
    function _burnerRole() internal pure virtual returns (bytes32);

    /**
     * @dev AC role, owner of which can pause mToken token
     */
    function _pauserRole() internal pure virtual returns (bytes32);
}
