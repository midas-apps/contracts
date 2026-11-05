// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice 6-decimal USDC mock meant to replace a USDC runtime code with
 * `hardhat_setCode` on forks, e.g. when the real USDC relies on a
 * chain-specific precompile that hardhat does not have
 * @dev decimals are hardcoded as `hardhat_setCode` does not run the constructor
 */
contract USDCMock is ERC20 {
    constructor() ERC20("USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
