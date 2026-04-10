// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20MockWithName is ERC20 {
    uint8 private _decimals;

    constructor(
        uint8 decimals_,
        string memory name,
        string memory symb
    ) ERC20(name, symb) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
