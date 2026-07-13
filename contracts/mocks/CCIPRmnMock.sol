// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IRMN} from "@chainlink/contracts-ccip/contracts/interfaces/IRMN.sol";

contract CCIPRmnMock is IRMN {
    bool private _sCursed;

    function setCursed(bool cursed) external {
        _sCursed = cursed;
    }

    function isCursed() external view override returns (bool) {
        return _sCursed;
    }

    function isCursed(bytes16) external view override returns (bool) {
        return _sCursed;
    }

    function getCursedSubjects()
        external
        pure
        override
        returns (bytes16[] memory)
    {
        return new bytes16[](0);
    }
}
