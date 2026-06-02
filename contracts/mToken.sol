// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import {RateLimitLibrary} from "./libraries/RateLimitLibrary.sol";
import {AccessControlUtilsLibrary} from "./libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "./interfaces/IMidasAccessControl.sol";

import "./access/Blacklistable.sol";
import "./interfaces/IMToken.sol";

/**
 * @title mToken
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mToken is ERC20PausableUpgradeable, Blacklistable, IMToken {
    using RateLimitLibrary for RateLimitLibrary.WindowRateLimits;
    using AccessControlUtilsLibrary for IMidasAccessControl;

    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @notice address to which clawback tokens will be sent
     */
    address public clawbackReceiver;

    /**
     * @notice if true then current transfer is clawback operation
     */
    bool private _inClawback;

    /**
     * @notice mint rate limits state
     */
    RateLimitLibrary.WindowRateLimits private _mintRateLimits;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[46] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     * @param _clawbackReceiver address to which clawback tokens will be sent
     */
    function initialize(address _accessControl, address _clawbackReceiver)
        external
    {
        _initializeV1(_accessControl);
        initializeV2(_clawbackReceiver);
    }

    /**
     * @dev v1 initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function _initializeV1(address _accessControl) private initializer {
        __WithMidasAccessControl_init(_accessControl);
        (string memory _name, string memory _symbol) = _getNameSymbol();
        __ERC20_init(_name, _symbol);
    }

    /**
     * @dev v2 initializer
     * @param _clawbackReceiver address to which clawback tokens will be sent
     */
    function initializeV2(address _clawbackReceiver)
        public
        virtual
        reinitializer(2)
    {
        require(
            _clawbackReceiver != address(0),
            InvalidAddress(_clawbackReceiver)
        );

        clawbackReceiver = _clawbackReceiver;
    }

    /**
     * @inheritdoc IMToken
     */
    function setClawbackReceiver(address _clawbackReceiver)
        external
        onlyContractAdmin
    {
        require(
            _clawbackReceiver != address(0),
            InvalidAddress(_clawbackReceiver)
        );
        clawbackReceiver = _clawbackReceiver;
        emit ClawbackReceiverSet(msg.sender, _clawbackReceiver);
    }

    /**
     * @inheritdoc IMToken
     */
    function mint(address to, uint256 amount)
        external
        onlyRoleNoTimelock(_minterRole(), false)
    {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function mintGoverned(address to, uint256 amount)
        external
        onlyContractAdmin // TODO: revise AC
    {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burn(address from, uint256 amount)
        external
        onlyRoleNoTimelock(_burnerRole(), false)
    {
        _onlyNotBlacklisted(from);
        _burn(from, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burnGoverned(address from, uint256 amount)
        external
        onlyContractAdmin // TODO: revise AC
    {
        _burn(from, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function clawback(uint256 amount, address from) external onlyContractAdmin {
        _inClawback = true;
        _transfer(from, clawbackReceiver, amount);
        _inClawback = false;
    }

    /**
     * @inheritdoc IMToken
     */
    function pause()
        external
        override
        onlyRoleNoTimelock(_pauserRole(), false)
    {
        _pause();
    }

    /**
     * @inheritdoc IMToken
     */
    function unpause()
        external
        override
        onlyRoleDelayOverride(_pauserRole(), 1 hours, false)
    {
        _unpause();
    }

    /**
     * @inheritdoc IMToken
     */
    function setMetadata(bytes32 key, bytes memory data)
        external
        onlyContractAdmin
    {
        metadata[key] = data;
    }

    /**
     * @inheritdoc IMToken
     */
    function increaseMintRateLimit(uint256 window, uint256 newLimit)
        external
        onlyContractAdmin
    {
        _setMintRateLimitConfig(window, newLimit, true);
    }

    /**
     * @inheritdoc IMToken
     */
    function decreaseMintRateLimit(uint256 window, uint256 newLimit)
        external
        onlyContractAdmin
    {
        _setMintRateLimitConfig(window, newLimit, false);
    }

    /**
     * @notice returns array of mint rate limit configs
     * @return statuses array of mint rate limit statuses
     */
    function getMintRateLimitStatuses()
        external
        view
        returns (
            RateLimitLibrary.WindowRateLimitStatus[] memory /* statuses */
        )
    {
        return _mintRateLimits.getWindowStatuses();
    }

    /**
     * @dev set mint rate limit config
     * @param window window duration in seconds
     * @param limit limit amount per window
     * @param increaseOnly if true - only increase the limit, if false - only decrease the limit
     */
    function _setMintRateLimitConfig(
        uint256 window,
        uint256 limit,
        bool increaseOnly
    ) private {
        uint256 previousLimit = _mintRateLimits.setWindowLimit(window, limit);

        bool isNewLimitValid = increaseOnly
            ? limit > previousLimit
            : limit < previousLimit;

        require(isNewLimitValid, InvalidNewLimit(limit, previousLimit));
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
            if (!_inClawback) {
                _onlyNotBlacklisted(from);
            }
            _onlyNotBlacklisted(to);
        }

        // if minting, check and update mint rate limit
        if (from == address(0)) {
            _mintRateLimits.consumeLimit(amount);
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

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function _contractAdminRole() internal pure override returns (bytes32) {
        return _DEFAULT_ADMIN_ROLE;
    }
}
