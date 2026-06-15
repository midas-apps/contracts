// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import {RateLimitLibrary} from "./libraries/RateLimitLibrary.sol";
import {AccessControlUtilsLibrary} from "./libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "./interfaces/IMidasAccessControl.sol";
import {PauseUtilsLibrary} from "./libraries/PauseUtilsLibrary.sol";
import {MidasInitializable} from "./abstract/MidasInitializable.sol";

import "./access/Blacklistable.sol";
import "./interfaces/IMToken.sol";

/**
 * @title mToken
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mToken is ERC20PausableUpgradeable, Blacklistable, IMToken {
    using RateLimitLibrary for RateLimitLibrary.WindowRateLimits;
    using AccessControlUtilsLibrary for IMidasAccessControl;

    /**
     * @dev role that grants contract admin rights to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _CONTRACT_ADMIN_ROLE;

    /**
     * @dev role that grants minter rights to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _MINTER_ROLE;

    /**
     * @dev role that grants burner rights to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _BURNER_ROLE;

    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @notice mint rate limits state
     */
    RateLimitLibrary.WindowRateLimits private _mintRateLimits;

    /**
     * @notice address to which clawback tokens will be sent
     */
    address public clawbackReceiver;

    /**
     * @notice if true then current transfer is clawback operation
     */
    bool internal _inClawback;

    /**
     * @notice name of the token
     */
    string private _name;

    /**
     * @notice symbol of the token
     */
    string private _symbol;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[44] private __gap;

    /**
     * @dev having a second gap here to match with the gap of previous implementations
     */
    uint256[50] private ___gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @param _minterRole minter role
     * @param _burnerRole burner role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(
        bytes32 _contractAdminRole,
        bytes32 _minterRole,
        bytes32 _burnerRole
    ) MidasInitializable() {
        _CONTRACT_ADMIN_ROLE = _contractAdminRole;
        _MINTER_ROLE = _minterRole;
        _BURNER_ROLE = _burnerRole;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     * @param _clawbackReceiver address to which clawback tokens will be sent
     * @param name_ name of the token
     * @param symbol_ symbol of the token
     */
    function initialize(
        address _accessControl,
        address _clawbackReceiver,
        string memory name_,
        string memory symbol_
    ) external {
        _initializeV1(_accessControl, name_, symbol_);
        initializeV2(_clawbackReceiver);
    }

    /**
     * @dev v1 initializer
     * @param _accessControl address of MidasAccessControll contract
     * @param name_ name of the token
     * @param symbol_ symbol of the token
     */
    function _initializeV1(
        address _accessControl,
        string memory name_,
        string memory symbol_
    ) private initializer {
        __WithMidasAccessControl_init(_accessControl);
        __ERC20_init(name_, symbol_);
    }

    /**
     * @dev v2 initializer
     * @param _clawbackReceiver address to which clawback tokens will be sent
     */
    function initializeV2(address _clawbackReceiver)
        public
        virtual
        reinitializer(3)
    {
        require(
            _clawbackReceiver != address(0),
            InvalidAddress(_clawbackReceiver)
        );

        clawbackReceiver = _clawbackReceiver;

        // to make upgrades safer, we sync the name and symbol from the ERC20Upgradeable
        _name = ERC20Upgradeable.name();
        _symbol = ERC20Upgradeable.symbol();
    }

    /**
     * @inheritdoc IMToken
     */
    function setNameSymbol(string memory name_, string memory symbol_)
        external
        onlyRoleDelayOverride(contractAdminRole(), 2 days, false)
    {
        _name = name_;
        _symbol = symbol_;
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
        emit ClawbackReceiverSet(_clawbackReceiver);
    }

    /**
     * @inheritdoc IMToken
     */
    function mint(address to, uint256 amount)
        external
        onlyRoleNoTimelock(minterRole(), false)
    {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function mintGoverned(address to, uint256 amount)
        external
        onlyContractAdmin
    {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burn(address from, uint256 amount)
        external
        onlyRoleNoTimelock(burnerRole(), false)
    {
        _onlyNotBlacklisted(from);
        _burn(from, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burnGoverned(address from, uint256 amount)
        external
        onlyContractAdmin
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
     * @notice AC role, owner of which can mint mToken token
     */
    function minterRole() public view virtual returns (bytes32) {
        return _MINTER_ROLE;
    }

    /**
     * @notice AC role, owner of which can burn mToken token
     */
    function burnerRole() public view virtual returns (bytes32) {
        return _BURNER_ROLE;
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function contractAdminRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return _CONTRACT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc ERC20Upgradeable
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @inheritdoc ERC20Upgradeable
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
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
        PauseUtilsLibrary.requireNotPaused(accessControl, msg.sig);

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
}
