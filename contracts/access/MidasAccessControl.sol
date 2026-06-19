// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasAccessControlManaged} from "../interfaces/IMidasAccessControlManaged.sol";

/**
 * @title MidasAccessControl
 * @notice Smart contract that stores all roles for Midas project
 * @author RedDuck Software
 */
contract MidasAccessControl is
    IMidasAccessControl,
    IMidasAccessControlManaged,
    AccessControlUpgradeable,
    MidasInitializable
{
    /**
     * @notice actor that can change green list statuses of addresses
     */
    bytes32 public constant GREENLIST_OPERATOR_ROLE =
        keccak256("GREENLIST_OPERATOR_ROLE");

    /**
     * @notice actor that can change black list statuses of addresses
     */
    bytes32 public constant BLACKLIST_OPERATOR_ROLE =
        keccak256("BLACKLIST_OPERATOR_ROLE");

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
     * @dev timelock delay for each role
     */
    mapping(bytes32 => uint32) private _roleTimelockDelays;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public timelockManager;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public pauseManager;

    /**
     * @notice default delay for all of the roles
     */
    uint32 public defaultDelay;

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
     * @dev validates that the caller has the function role with timelock
     * @param role base role to validate
     * @param overrideDelay override delay for the invocation
     */
    modifier onlyRoleDelayOverride(bytes32 role, uint32 overrideDelay) {
        _validateRoleAccess(role, overrideDelay);
        _;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _defaultDelay default delay
     * @param _userFacingRoles array of additional user facing roles
     */
    function initialize(
        uint32 _defaultDelay,
        bytes32[] calldata _userFacingRoles
    ) external {
        _initializeV1();
        initializeV2(_defaultDelay, _userFacingRoles);
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
     * @param _userFacingRoles array of additional user facing roles
     */
    function initializeV2(
        uint32 _defaultDelay,
        bytes32[] calldata _userFacingRoles
    ) public reinitializer(2) {
        _validateDelay(_defaultDelay);

        defaultDelay = _defaultDelay;

        isUserFacingRole[
            AccessControlUtilsLibrary.DEFAULT_BLACKLISTED_ROLE
        ] = true;
        isUserFacingRole[
            AccessControlUtilsLibrary.DEFAULT_GREENLISTED_ROLE
        ] = true;

        for (uint256 i = 0; i < _userFacingRoles.length; ++i) {
            isUserFacingRole[_userFacingRoles[i]] = true;
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
    function setDefaultDelay(uint32 _defaultDelay)
        external
        onlyRoleDelayOverride(DEFAULT_ADMIN_ROLE, 2 days)
    {
        _validateDelay(_defaultDelay);
        defaultDelay = _defaultDelay;
        emit SetDefaultDelay(_defaultDelay);
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setRoleDelayMult(SetRoleDelayParams[] calldata params)
        external
        onlyRoleWithTimelock(DEFAULT_ADMIN_ROLE)
    {
        require(params.length > 0, EmptyArray());

        for (uint256 i = 0; i < params.length; ++i) {
            _validateDelay(params[i].delay);
            _roleTimelockDelays[params[i].role] = params[i].delay;
        }

        emit SetRoleDelays(params);
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
            SetUserFacingRoleParams calldata param = params[i];

            // if value already set, skip and do not emit event
            if (isUserFacingRole[param.role] == param.enabled) {
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
        address targetContract,
        SetGrantOperatorRoleParams[] calldata params
    ) external {
        require(params.length > 0, EmptyArray());

        bytes32 masterRole = _getContractAdminRole(targetContract);
        _validateRoleAccess(masterRole);

        AccessControlUtilsLibrary.requireNotUserFacingRole(this, masterRole);

        for (uint256 i = 0; i < params.length; ++i) {
            SetGrantOperatorRoleParams calldata param = params[i];

            bytes32 operatorKey = grantOperatorRoleKey(
                masterRole,
                targetContract,
                param.functionSelector
            );

            _validateAndUpdateDelay(operatorKey, param.delay);

            // if value already set, skip and do not emit event
            if (
                _grantOperatorRoles[operatorKey][param.operator] ==
                param.enabled
            ) {
                continue;
            }

            _grantOperatorRoles[operatorKey][param.operator] = param.enabled;
            emit SetGrantOperatorRole(
                masterRole,
                targetContract,
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
        uint32 delay,
        SetPermissionRoleParams[] calldata params
    ) public {
        bytes32 operatorRoleKey = grantOperatorRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );

        _validateOperatorRoleAccess(masterRole, operatorRoleKey, _msgSender());

        require(params.length > 0, EmptyArray());

        bytes32 functionRoleKey = permissionRoleKey(
            masterRole,
            targetContract,
            functionSelector
        );

        _validateAndUpdateDelay(functionRoleKey, delay);

        for (uint256 i = 0; i < params.length; ++i) {
            SetPermissionRoleParams calldata param = params[i];

            // if value already set, skip and do not emit event
            if (
                _permissionRoles[functionRoleKey][param.account] ==
                param.enabled
            ) {
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
     * @inheritdoc IMidasAccessControl
     */
    function setPermissionRoleMult(
        address targetContract,
        bytes4 functionSelector,
        uint32 delay,
        SetPermissionRoleParams[] calldata params
    ) external {
        bytes32 masterRole = _getContractAdminRole(targetContract);
        setPermissionRoleMult(
            masterRole,
            targetContract,
            functionSelector,
            delay,
            params
        );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function grantRoleMult(GrantRoleMultParams[] calldata params) external {
        require(params.length > 0, EmptyArray());

        bytes32 adminRole = getRoleAdmin(params[0].role);
        _validateRoleAccess(adminRole);

        for (uint256 i = 0; i < params.length; ++i) {
            GrantRoleMultParams calldata param = params[i];

            require(
                getRoleAdmin(param.role) == adminRole,
                RoleAdminMismatch(param.role, adminRole)
            );
            _grantRole(param.role, param.account);
            _validateAndUpdateDelay(param.role, param.delay);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function revokeRoleMult(RevokeRoleMultParams[] calldata params) external {
        require(params.length > 0, EmptyArray());

        bytes32 adminRole = getRoleAdmin(params[0].role);
        address actualSender = _validateRoleAccess(adminRole);

        for (uint256 i = 0; i < params.length; ++i) {
            RevokeRoleMultParams calldata param = params[i];

            require(
                getRoleAdmin(param.role) == adminRole,
                RoleAdminMismatch(param.role, adminRole)
            );
            _validateRevokeRole(param.role, param.account, actualSender);
            _revokeRole(param.role, param.account);
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
     * @inheritdoc IMidasAccessControl
     */
    function grantRole(
        bytes32 role,
        address account,
        uint32 delay
    ) public {
        grantRole(role, account);
        _validateAndUpdateDelay(role, delay);
    }

    /**
     * @inheritdoc AccessControlUpgradeable
     */
    function revokeRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        address actualSender = _validateRoleAccess(getRoleAdmin(role));

        _validateRevokeRole(role, account, actualSender);
        _revokeRole(role, account);
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
     * @inheritdoc IMidasAccessControl
     */
    function getRoleTimelockDelay(bytes32 role, uint32 overrideDelay)
        public
        view
        returns (
            uint32, /* delay */
            bool /* isDefault */
        )
    {
        uint32 delay = overrideDelay != AccessControlUtilsLibrary.NULL_DELAY
            ? overrideDelay
            : _roleTimelockDelays[role];

        uint32 actualDelay = delay == AccessControlUtilsLibrary.NULL_DELAY
            ? defaultDelay
            : delay == AccessControlUtilsLibrary.NO_DELAY
            ? 0
            : delay;

        return (actualDelay, delay == 0);
    }

    /**
     * @inheritdoc IMidasAccessControlManaged
     */
    function contractAdminRole() public view override returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }

    /**
     * @dev validates and sets the delay for a role during the role granting
     * @param role role id
     */
    function _validateAndUpdateDelay(bytes32 role, uint32 delay) private {
        if (delay == AccessControlUtilsLibrary.NULL_DELAY) {
            return;
        }

        _validateDelay(delay);

        require(_roleTimelockDelays[role] == 0, DelayIsAlreadySet());

        _roleTimelockDelays[role] = delay;
        emit SetRoleDelay(role, delay);
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

        _setRoleAdmin(
            AccessControlUtilsLibrary.DEFAULT_BLACKLISTED_ROLE,
            BLACKLIST_OPERATOR_ROLE
        );
        _setRoleAdmin(
            AccessControlUtilsLibrary.DEFAULT_GREENLISTED_ROLE,
            GREENLIST_OPERATOR_ROLE
        );
    }

    /**
     * @dev validates that the delay is within the maximum delay
     * @param delay delay to validate
     */
    function _validateDelay(uint32 delay) private view {
        AccessControlUtilsLibrary.validateTimelockDelay(delay);
    }

    /**
     * @notice verifies that the role can be revoked
     * @param role role to be revoked
     * @param account account to be revoked
     * @param actualSender account that actually verified for the function access
     */
    function _validateRevokeRole(
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
     * @param overrideDelay override delay for the invocation
     * @return actualAccount actual account that has access to the function
     */
    function _validateRoleAccess(bytes32 role, uint32 overrideDelay)
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
                overrideDelay,
                false,
                _msgSender(),
                false
            );
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
     * @dev validates that the account with a master or operator role has access to the function
     * selects a role with a shortest delay in case if has both roles
     * @param masterRole master role
     * @param operatorRole operator role
     * @param account account to check access for
     */
    function _validateOperatorRoleAccess(
        bytes32 masterRole,
        bytes32 operatorRole,
        address account
    ) internal view {
        bytes32 role = _resolveOperatorRole(masterRole, operatorRole, account);
        bool isOperatorRole = role == operatorRole;

        AccessControlUtilsLibrary.validateFunctionAccessWithTimelock(
            this,
            role,
            AccessControlUtilsLibrary.NULL_DELAY,
            isOperatorRole,
            account,
            false
        );
    }

    /**
     * @dev validates that the account has either operator or master role and uses the role with a shortest delay
     * @param masterRole master role
     * @param operatorRole operator role
     * @param account account to check access for
     */
    function _resolveOperatorRole(
        bytes32 masterRole,
        bytes32 operatorRole,
        address account
    ) internal view returns (bytes32) {
        bool isOperator = isFunctionAccessGrantOperator(operatorRole, account);
        bool hasMasterRole = hasRole(masterRole, account);

        if (!isOperator && !hasMasterRole) {
            return operatorRole;
        }

        if (!hasMasterRole) {
            return operatorRole;
        }

        if (!isOperator) {
            return masterRole;
        }

        return
            AccessControlUtilsLibrary.resolveAccessRole(
                this,
                masterRole,
                operatorRole,
                AccessControlUtilsLibrary.NULL_DELAY
            );
    }

    /**
     * @notice gets the contract admin role for the target contract
     * @param targetContract address of the target contract
     * @return contractAdminRole contract admin role
     */
    function _getContractAdminRole(address targetContract)
        private
        view
        returns (bytes32)
    {
        return IMidasAccessControlManaged(targetContract).contractAdminRole();
    }
}
