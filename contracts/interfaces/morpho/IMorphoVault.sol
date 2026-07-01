// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title IMorphoVault
 * @notice Morpho Vault interface extending the ERC-4626 Tokenized Vault Standard
 * @dev Works with both Morpho Vaults V1 (MetaMorpho) and V2
 * V1 repo: https://github.com/morpho-org/metamorpho-v1.1
 * V2 repo: https://github.com/morpho-org/vault-v2
 */
interface IMorphoVault is IERC4626 {

}
