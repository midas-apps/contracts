// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

/**
 * @title MidasAccessControl
 * @notice Smart contract that stores all roles for Midas project
 * @author RedDuck Software
 */
contract MidasAccessControl is
    IMidasAccessControl,
    AccessControlUpgradeable,
    MidasInitializable,
    MidasAccessControlRoles
{
    /**
     * @notice roles that are held by users
     */
    mapping(bytes32 => bool) public isUserFacingRole;

    /**
     * @dev Grant operators may call `setPermissionRoleMult` for the corresponding permission key.
     */
    mapping(bytes32 => mapping(address => bool)) private _grantOperatorRoles;

    /**
     * @dev Accounts allowed to call the scoped function on `targetContract`.
     */
    mapping(bytes32 => mapping(address => bool)) private _permissionRoles;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public timelockManager;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public pauseManager;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev validates that the msg.sender has the role
     * @param role role to check access for
     */
    modifier onlyRoleWithTimelock(bytes32 role) {
        _validateRoleAccess(role);
        _;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     */
    function initialize() external {
        _initializeV1();

        bytes32[] memory userFacingRoles = new bytes32[](2);

        userFacingRoles[0] = BLACKLISTED_ROLE;
        userFacingRoles[1] = GREENLISTED_ROLE;

        initializeV2(userFacingRoles);
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     */
    function _initializeV1() private initializer {
        __AccessControl_init();
        _setupRoles(_msgSender());
    }

    /**
     * @notice initializerV2. Initializes user facing roles
     * @param userFacingRoles array of user facing roles
     */
    function initializeV2(bytes32[] memory userFacingRoles)
        public
        reinitializer(2)
    {
        for (uint256 i = 0; i < userFacingRoles.length; ++i) {
            isUserFacingRole[userFacingRoles[i]] = true;
        }
    }

    /**
     * @notice initializes timelock manager. Moved to a searate initializer
     * as its 2-way dependency between the contracts.
     * @dev can be called only by DEFAULT_ADMIN_ROLE
     * @param _timelockManager address of the timelock manager
     * @param _pauseManager address of the pause manager
     */
    function initializeRelationships(
        address _timelockManager,
        address _pauseManager
    ) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());

        require(timelockManager == address(0), InvalidAddress(timelockManager));
        require(pauseManager == address(0), InvalidAddress(pauseManager));

        require(
            _timelockManager != address(0),
            InvalidAddress(_timelockManager)
        );
        require(_pauseManager != address(0), InvalidAddress(_pauseManager));

        timelockManager = _timelockManager;
        pauseManager = _pauseManager;
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setUserFacingRoleMult(SetUserFacingRoleParams[] calldata params)
        external
        onlyRoleWithTimelock(DEFAULT_ADMIN_ROLE)
    {
        require(params.length > 0, EmptyArray());

        for (uint256 i = 0; i < params.length; ++i) {
            SetUserFacingRoleParams memory param = params[i];

            // if already enabled, skip and do not emit event
            if (isUserFacingRole[param.role]) {
                continue;
            }

            isUserFacingRole[param.role] = param.enabled;
            emit SetUserFacingRole(param.role, param.enabled);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setGrantOperatorRoleMult(
        bytes32 masterRole,
        SetGrantOperatorRoleParams[] calldata params
    ) external onlyRoleWithTimelock(masterRole) {
        require(params.length > 0, EmptyArray());

        require(
            !isUserFacingRole[masterRole],
            AccessControlUtilsLibrary.UserFacingRoleNotAllowed(masterRole)
        );

        for (uint256 i = 0; i < params.length; ++i) {
            SetGrantOperatorRoleParams memory param = params[i];

            bytes32 operatorKey = grantOperatorRoleKey(
                masterRole,
                param.targetContract,
                param.functionSelector
            );

            // if already enabled, skip and do not emit event
            if (_grantOperatorRoles[operatorKey][param.operator]) {
                continue;
            }

            _grantOperatorRoles[operatorKey][param.operator] = param.enabled;
            emit SetGrantOperatorRole(
                masterRole,
                param.targetContract,
                param.operator,
                param.functionSelector,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setPermissionRoleMult(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        SetPermissionRoleParams[] calldata params
    ) external {
        bytes32 operatorRoleKey = grantOperatorRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );

        _validateOperatorRoleAccess(operatorRoleKey, _msgSender());

        require(params.length > 0, EmptyArray());

        bytes32 functionRoleKey = permissionRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );

        for (uint256 i = 0; i < params.length; ++i) {
            SetPermissionRoleParams memory param = params[i];

            // if already enabled, skip and do not emit event
            if (_permissionRoles[functionRoleKey][param.account]) {
                continue;
            }

            _permissionRoles[functionRoleKey][param.account] = param.enabled;
            emit SetPermissionRole(
                masterRole,
                targetContract,
                param.account,
                functionSelector,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc AccessControlUpgradeable
     */
    function grantRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
        onlyRoleWithTimelock(getRoleAdmin(role))
    {
        _grantRole(role, account);
    }

    /**
     * @inheritdoc AccessControlUpgradeable
     */
    function revokeRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        address actualSender = _validateRoleAccess(getRoleAdmin(role));

        _verifyRevokeRole(role, account, actualSender);
        _revokeRole(role, account);
    }

    /**
     * @notice grant multiple roles to multiple users
     * in one transaction
     * @dev length`s of 2 arays should match. All the roles should have the same admin role.
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function grantRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(
            roles.length == addresses.length,
            MismatchArrays(roles.length, addresses.length)
        );

        require(roles.length > 0, EmptyArray());

        bytes32 adminRole = getRoleAdmin(roles[0]);
        _validateRoleAccess(adminRole);

        for (uint256 i = 0; i < roles.length; ++i) {
            require(
                getRoleAdmin(roles[i]) == adminRole,
                "MAC: role admin mismatch"
            );
            _grantRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice revoke multiple roles from multiple users
     * in one transaction
     * @dev length`s of 2 arays should match. All the roles should have the same admin role.
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function revokeRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(
            roles.length == addresses.length,
            MismatchArrays(roles.length, addresses.length)
        );
        require(roles.length > 0, EmptyArray());

        bytes32 adminRole = getRoleAdmin(roles[0]);
        address actualSender = _validateRoleAccess(adminRole);

        for (uint256 i = 0; i < roles.length; ++i) {
            require(
                getRoleAdmin(roles[i]) == adminRole,
                "MAC: role admin mismatch"
            );
            _verifyRevokeRole(roles[i], addresses[i], actualSender);
            _revokeRole(roles[i], addresses[i]);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole)
        external
        onlyRoleWithTimelock(getRoleAdmin(role))
    {
        _setRoleAdmin(role, newAdminRole);
    }

    // solhint-disable-next-line
    /**
     * @notice renouce role is forbidden
     */
    function renounceRole(bytes32, address)
        public
        pure
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        revert Forbidden();
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionAccessGrantOperator(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        address operator
    ) external view returns (bool) {
        bytes32 key = grantOperatorRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );
        return isFunctionAccessGrantOperator(key, operator);
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionAccessGrantOperator(bytes32 key, address operator)
        public
        view
        returns (bool)
    {
        return _grantOperatorRoles[key][operator];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        address account
    ) external view returns (bool) {
        bytes32 key = permissionRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );
        return _permissionRoles[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(bytes32 key, address account)
        external
        view
        returns (bool)
    {
        return _permissionRoles[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function permissionRoleKey(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector
    ) public pure returns (bytes32) {
        return
            _functionPermissionKey(
                masterRole,
                targetContract,
                functionSelector,
                ""
            );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function grantOperatorRoleKey(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector
    ) public pure returns (bytes32) {
        return
            _functionPermissionKey(
                masterRole,
                targetContract,
                functionSelector,
                "operator"
            );
    }

    /**
     * @dev calculates the base key for function permission mappings
     * @param masterRole OZ role for the scope
     */
    function _functionPermissionKey(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        bytes memory additionalData
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    masterRole,
                    targetContract,
                    functionSelector,
                    additionalData
                )
            );
    }

    /**
     * @dev setup roles during the contracts initialization
     */
    function _setupRoles(address admin) private {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);
    }

    /**
     * @notice verifies that the role can be revoked
     * @param role role to be revoked
     * @param account account to be revoked
     * @param actualSender account that actually verified for the function access
     */
    function _verifyRevokeRole(
        bytes32 role,
        address account,
        address actualSender
    ) private {
        if (role == DEFAULT_ADMIN_ROLE && account == actualSender) {
            revert CannotRevokeFromSelf(role, actualSender);
        }
    }

    /**
     * @notice validates that the msg.sender with a role has access to the function
     * @param role role to check access for
     * @return actualAccount actual account that has access to the function
     */
    function _validateRoleAccess(bytes32 role)
        internal
        view
        returns (
            address /* actualAccount */
        )
    {
        return
            AccessControlUtilsLibrary.validateFunctionAccessWithTimelock(
                this,
                role,
                AccessControlUtilsLibrary.NULL_DELAY,
                false,
                _msgSender(),
                false
            );
    }

    /**
     * @notice validates that the account with a role has access to the function
     * @param role role to check access for
     * @param account account to check access for
     */
    function _validateOperatorRoleAccess(bytes32 role, address account)
        internal
        view
    {
        AccessControlUtilsLibrary.validateFunctionAccessWithTimelock(
            this,
            role,
            AccessControlUtilsLibrary.NULL_DELAY,
            true,
            account,
            false
        );
    }
}
