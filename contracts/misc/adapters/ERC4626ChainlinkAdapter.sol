// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./ChainlinkAdapterBase.sol";

/**
 * @title ChainlinkAggregatorV3 compatible adapter for ERC4626 vaults
 * @dev uses convertToAssets for the answer
 */
contract ERC4626ChainlinkAdapter is ChainlinkAdapterBase {
    /**
     * @notice erc4626 vault
     */
    address public vault;

    /**
     * @dev constructor
     * @param _vault erc4626 vault address
     */
    constructor(address _vault) {
        vault = _vault;
    }

    function description()
        external
        pure
        virtual
        override
        returns (string memory)
    {
        return "A ChainlinkAggregatorV3 compatible adapter for ERC4626 vaults";
    }

    function decimals() public view override returns (uint8) {
        return IERC20Metadata(IERC4626(vault).asset()).decimals();
    }

    function vaultDecimals() public view returns (uint8) {
        return IERC4626(vault).decimals();
    }

    function latestAnswer() public view virtual override returns (int256) {
        return int256(IERC4626(vault).convertToAssets(10 ** vaultDecimals()));
    }
}
