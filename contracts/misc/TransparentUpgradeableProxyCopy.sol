// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

// we need it to enforce generation of hardhat artifacts for TransparentUpgradeableProxy
// for further manual proxy verification on sourcify
contract TransparentUpgradeableProxyCopy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) payable TransparentUpgradeableProxy(_logic, admin_, _data) {}
}
