// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../libraries/DecimalsCorrectionLibrary.sol";

contract DecimalsCorrectionTester {
    using DecimalsCorrectionLibrary for uint256;

    function convertAmountFromBase18Public(uint256 amount, uint256 decimals)
        public
        pure
        returns (uint256)
    {
        return amount.convertFromBase18(decimals);
    }

    function convertAmountToBase18Public(uint256 amount, uint256 decimals)
        public
        pure
        returns (uint256)
    {
        return amount.convertToBase18(decimals);
    }
}
