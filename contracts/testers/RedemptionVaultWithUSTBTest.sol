// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithUSTB.sol";

contract RedemptionVaultWithUSTBTest is RedemptionVaultWithUSTB {
    function _disableInitializers() internal override {}

    function checkAndRedeemUSTB(address token, uint256 amount) external {
        _checkAndRedeemUSTB(token, amount);
    }
}
