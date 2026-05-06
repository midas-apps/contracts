// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

/**
 * @title MidasAccessControlTimelockController
 * @notice TimelockController for Midas Protocol that is controlled by MidasAccessControl
 * @author RedDuck Software
 */
contract MidasAccessControlTimelockController is TimelockControllerUpgradeable {
    /**
     * @notice address of MidasAccessControl contract
     */
    address public accessControl;

    /**
     * @notice original caller for each operation id
     * @dev resets after execution or cancellation
     */
    mapping(bytes32 => address) public originalCaller;

    /**
     * @notice predecessor for each operation id
     */
    mapping(bytes32 => bytes32) public predecessor;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice event emitted when original caller is set
     * @param id operation id
     * @param originalCaller original caller
     */
    event OriginalCallerSet(bytes32 indexed id, address indexed originalCaller);

    /**
     * @notice event emitted when operation is reset
     * @param id operation id
     */
    event OperationReset(bytes32 indexed id);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(address _accessControl) external initializer {
        address[] memory acArray = new address[](1);
        acArray[0] = _accessControl;

        __TimelockController_init(0, acArray, acArray, address(0));

        accessControl = _accessControl;
    }

    // /**
    //  * @inheritdoc IMidasAccessControlTimelockController
    //  * @notice schedules a new operation and saves original caller for the operation
    //  * @param originalCaller original caller for the operation
    //  */
    // function schedule(
    //     address target,
    //     uint256 value,
    //     bytes calldata data,
    //     address originalCaller,
    //     bytes32 predecessor,
    //     bytes32 salt,
    //     uint256 delay
    // ) public override {
    //     super.schedule(target, value, data, predecessor, salt, delay);
    //     bytes32 id = hashOperation(target, value, data, predecessor, salt);
    //     originalCaller[id] = originalCaller;
    //     emit OriginalCallerSet(id, originalCaller);
    // }

    // /**
    //  * @inheritdoc TimelockControllerUpgradeable
    //  * @notice forbidden to execute batch operations
    //  */
    // function executeBatch(
    //     address[] calldata, /* targets */
    //     uint256[] calldata, /* values */
    //     bytes[] calldata, /* payloads */
    //     bytes32, /* predecessor */
    //     bytes32 /* salt */
    // ) public payable virtual {
    //     revert("MACTC: Forbidden");
    // }

    // function execute(
    //     address target,
    //     uint256 value,
    //     bytes calldata data,
    //     bytes32 predecessor,
    //     bytes32 salt
    // ) public payable virtual {
    //     super.execute(target, value, data, predecessor, salt);
    //     bytes32 id = hashOperation(target, value, data, predecessor, salt);
    //     delete originalCaller[id];
    //     delete
    //     emit OperationReset(id);
    // }
}
