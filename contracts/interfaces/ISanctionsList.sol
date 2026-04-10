// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

// TODO: add natspec
interface ISanctionsList {
    function isSanctioned(address addr) external view returns (bool);
}
