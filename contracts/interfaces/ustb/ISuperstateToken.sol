// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ISuperstateToken is IERC20Upgradeable {
    function symbol() external view returns (string memory);

    function allowListV2() external view returns (address);
}
