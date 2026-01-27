// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract YInjOracleMock {
    uint256 private _rate;

    constructor(uint256 _rate) {
        _rate = _rate;
    }

    function getExchangeRate() external view returns (uint256) {
        return _rate;
    }
}
