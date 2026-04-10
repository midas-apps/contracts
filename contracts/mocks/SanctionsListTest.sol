// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../interfaces/ISanctionsList.sol";

contract SanctionsListMock is ISanctionsList {
    mapping(address => bool) public override isSanctioned;

    function setSanctioned(address addr, bool sanctioned) external {
        isSanctioned[addr] = sanctioned;
    }
}
