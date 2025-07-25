// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

import "./access/Blacklistable.sol";
import "./interfaces/IMToken.sol";

/**
 * @title mToken
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mToken is ERC20PausableUpgradeable, Blacklistable, IMToken {
    /**
     * @notice metadata key => metadata value
     */
    mapping(bytes32 => bytes) public metadata;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external virtual initializer {
        __Blacklistable_init(_accessControl);
        (string memory _name, string memory _symbol) = _getNameSymbol();
        __ERC20_init(_name, _symbol);
    }

    /**
     * @inheritdoc IMToken
     */
    function mint(
        address to,
        uint256 amount
    ) external onlyRole(_minterRole(), msg.sender) {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IMToken
     */
    function burn(
        address from,
        uint256 amount
    ) external onlyRole(_burnerRole(), msg.sender) {
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
    function setMetadata(
        bytes32 key,
        bytes memory data
    ) external onlyRole(DEFAULT_ADMIN_ROLE, msg.sender) {
        metadata[key] = data;
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
