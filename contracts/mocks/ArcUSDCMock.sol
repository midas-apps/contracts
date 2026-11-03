// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice Arc USDC (0x3600...0000) moves native balances through an Arc-only
 * precompile, which does not exist on a hardhat fork. Fork tests replace its
 * runtime code with this mock so the real Teller/USYC can be exercised.
 * @dev decimals are hardcoded as `hardhat_setCode` does not run the constructor
 */
contract ArcUSDCMock is ERC20 {
    constructor() ERC20("USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
