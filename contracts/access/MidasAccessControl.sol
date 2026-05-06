// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";

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
     * @notice role that can execute timelock transactions
     */
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /**
     * @dev Only when true may holders of `functionAccessAdminRole` manage grant operators for that role's scopes.
     */
    mapping(bytes32 => bool) public functionAccessAdminRoleEnabled;

    /// @dev Grant operators may call `setFunctionPermission` for the corresponding permission key.
    mapping(bytes32 => mapping(address => bool))
        private _functionAccessGrantOperators;

    /// @dev Accounts allowed to call the scoped function on `targetContract`.
    mapping(bytes32 => mapping(address => bool)) private _functionPermissions;

    /**
     * @notice timelock delay for each role
     */
    mapping(bytes32 => uint256) public roleTimelocks;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public timelock;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     */
    function initialize() external initializer {
        __AccessControl_init();
        _setupRoles(_msgSender());
    }

    /**
     * @notice initializes timelock. Moved to a searate initializer
     * as its 2-way dependency between the contracts.
     * @dev can be called only by DEFAULT_ADMIN_ROLE
     * @param _timelock address of the timelock controller
     */
    function initializeTimelock(address _timelock) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        require(timelock == address(0), "MAC: timelock already set");
        require(_timelock != address(0), "MAC: invalid timelock");
        timelock = _timelock;
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessAdminRoleEnabledMult(
        SetFunctionAccessAdminRoleEnabledParams[] calldata params
    ) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionAccessAdminRoleEnabledParams memory param = params[i];

            // if already enabled, skip and do not emit event
            if (functionAccessAdminRoleEnabled[param.functionAccessAdminRole]) {
                continue;
            }

            functionAccessAdminRoleEnabled[
                param.functionAccessAdminRole
            ] = param.enabled;
            emit FunctionAccessAdminRoleEnable(
                param.functionAccessAdminRole,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessGrantOperatorMult(
        SetFunctionAccessGrantOperatorParams[] calldata params
    ) external {
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionAccessGrantOperatorParams memory param = params[i];
            require(
                functionAccessAdminRoleEnabled[param.functionAccessAdminRole],
                "MAC: FA admin role disabled"
            );
            _checkRole(param.functionAccessAdminRole, _msgSender());
            bytes32 key = functionPermissionKey(
                param.functionAccessAdminRole,
                param.targetContract,
                param.functionSelector
            );

            // if already enabled, skip and do not emit event
            if (_functionAccessGrantOperators[key][param.operator]) {
                continue;
            }

            _functionAccessGrantOperators[key][param.operator] = param.enabled;
            emit FunctionAccessGrantOperatorUpdate(
                param.functionAccessAdminRole,
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
    function setFunctionPermissionMult(
        SetFunctionPermissionParams[] calldata params
    ) external {
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionPermissionParams memory param = params[i];
            bytes32 key = functionPermissionKey(
                param.functionAccessAdminRole,
                param.targetContract,
                param.functionSelector
            );
            require(
                _functionAccessGrantOperators[key][_msgSender()],
                "MAC: not FA grant operator"
            );

            // if already enabled, skip and do not emit event
            if (_functionPermissions[key][param.account]) {
                continue;
            }

            _functionPermissions[key][param.account] = param.enabled;
            emit FunctionPermissionUpdate(
                param.functionAccessAdminRole,
                param.targetContract,
                param.account,
                param.functionSelector,
                param.enabled
            );
        }
    }

    /**
     * @notice grant multiple roles to multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function grantRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");

        for (uint256 i = 0; i < roles.length; ++i) {
            _checkRole(getRoleAdmin(roles[i]), _msgSender());
            _grantRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice revoke multiple roles from multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function revokeRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");
        for (uint256 i = 0; i < roles.length; ++i) {
            _checkRole(getRoleAdmin(roles[i]), _msgSender());
            _revokeRole(roles[i], addresses[i]);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(role, newAdminRole);
    }

    function setRoleTimelocks(bytes32[] memory roles, uint256[] memory delays)
        external
    {
        // TODO: check the role admin instead of default admin
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        for (uint256 i = 0; i < roles.length; ++i) {
            roleTimelocks[roles[i]] = delays[i];
        }
    }

    //solhint-disable disable-next-line
    function renounceRole(bytes32, address)
        public
        pure
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        revert("MAC: Forbidden");
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionAccessGrantOperator(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address operator
    ) external view returns (bool) {
        bytes32 key = functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return _functionAccessGrantOperators[key][operator];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address account
    ) external view returns (bool) {
        bytes32 key = functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return _functionPermissions[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(bytes32 key, address account)
        external
        view
        returns (bool)
    {
        return _functionPermissions[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        address target,
        bytes calldata data,
        address originalCaller
    ) external view returns (bool ready, bool timelocked) {
        uint256 delay = roleTimelocks[targetRole];

        TimelockController _timelock = TimelockController(payable(timelock));

        bytes32 operationId = _timelock.hashOperation(
            target,
            0,
            _appendCallerToCalldata(data, originalCaller),
            bytes32(0),
            bytes32(0)
        );

        bool isOperation = _timelock.isOperation(operationId);

        if (!isOperation && delay == 0) {
            return (true, false);
        }

        bool isReadyToExecute = _timelock.isOperationReady(operationId);

        if (isReadyToExecute) {
            return (true, true);
        } else {
            return (false, true);
        }
    }

    function _appendCallerToCalldata(bytes calldata data, address caller)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(data, caller);
    }

    function scheduleTimelockTransactions(
        address[] calldata targets,
        bytes[] calldata datas
    ) external {
        for (uint256 i = 0; i < targets.length; ++i) {
            _scheduleTimelockTransaction(targets[i], datas[i]);
        }
    }

    function executeTimelockTransaction(
        address target,
        bytes calldata data,
        address originalCaller
    ) external {
        require(
            _msgSender() == originalCaller ||
                hasRole(EXECUTOR_ROLE, _msgSender()),
            "MAC: unauthorized"
        );

        TimelockController(payable(timelock)).execute(
            target,
            0,
            _appendCallerToCalldata(data, originalCaller),
            bytes32(0),
            bytes32(0)
        );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function functionPermissionKey(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    functionAccessAdminRole,
                    targetContract,
                    functionSelector
                )
            );
    }

    function _scheduleTimelockTransaction(address target, bytes calldata data)
        internal
    {
        bytes memory dataWithCaller = _appendCallerToCalldata(
            data,
            _msgSender()
        );
        bytes32 targetRole = _getTargetRole(target, dataWithCaller);

        uint256 delay = roleTimelocks[targetRole];

        require(delay != type(uint256).max, "MAC: no timelock");

        // TODO: replace 3600 with the default delay that is passed in the initializer
        delay = delay == 0 ? 3600 : (delay == type(uint256).max ? 0 : delay);

        TimelockController(payable(timelock)).schedule(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(0),
            delay
        );
    }

    function _getTargetRole(address target, bytes memory data)
        private
        returns (bytes32)
    {
        (bool success, bytes memory err) = target.call(data);

        require(!success, "MAC: expected to revert");

        return _decodePreflightSucceededError(err);
    }

    function _decodePreflightSucceededError(bytes memory err)
        private
        pure
        returns (bytes32 role)
    {
        require(err.length == 36, "MAC: invalid error length");

        bytes4 selector;

        // getting the selector of custom error
        assembly {
            selector := mload(add(err, 32))
        }

        // checking if the error is a RolePreflightSucceeded error
        require(selector == RolePreflightSucceeded.selector, "MAC: expected");

        assembly {
            role := mload(add(err, 36))
        }
    }

    /**
     * @dev setup roles during the contracts initialization
     */
    function _setupRoles(address admin) private {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);
    }
}
