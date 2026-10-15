// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract YInjOracleMock {
    uint256 private _rate;

    constructor(uint256 rate_) {
        _rate = rate_;
    }

    function getExchangeRate() external view returns (uint256) {
        return _rate;
    }
}
