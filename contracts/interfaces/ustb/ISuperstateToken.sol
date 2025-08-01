// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISuperstateToken is IERC20 {
    struct StablecoinConfig {
        address sweepDestination;
        uint96 fee;
    }

    function subscribe(
        address to,
        uint256 inAmount,
        address stablecoin
    ) external;

    function setStablecoinConfig(
        address stablecoin,
        address newSweepDestination,
        uint96 newFee
    ) external;

    function supportedStablecoins(address stablecoin)
        external
        view
        returns (StablecoinConfig memory);

    function symbol() external view returns (string memory);

    function owner() external view returns (address);

    function allowListV2() external view returns (address);

    function isAllowed(address addr) external view returns (bool);
}
