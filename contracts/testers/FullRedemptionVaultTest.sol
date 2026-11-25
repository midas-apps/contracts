// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {FullRedemptionVault} from "../FullRedemptionVault.sol";
import {MidasAuthLibrary} from "../libraries/MidasAuthLibrary.sol";

contract FullRedemptionVaultTest is FullRedemptionVault {
    constructor()
        FullRedemptionVault(
            keccak256("FULL_REDEMPTION_VAULT_ADMIN_ROLE"),
            MidasAuthLibrary.DEFAULT_GREENLISTED_ROLE
        )
    {}

    function _disableInitializers() internal virtual override {}
}
