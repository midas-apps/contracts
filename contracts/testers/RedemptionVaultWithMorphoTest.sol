// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithMorpho.sol";

contract RedemptionVaultWithMorphoTest is RedemptionVaultWithMorpho {
    function _disableInitializers() internal override {}

    function checkAndRedeemMorpho(address token, uint256 amount) external {
        _checkAndRedeemMorpho(token, amount);
    }
}
