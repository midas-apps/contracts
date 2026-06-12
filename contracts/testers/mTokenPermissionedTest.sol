// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../mTokenPermissioned.sol";

//solhint-disable contract-name-camelcase
contract mTokenPermissionedTest is mTokenPermissioned {
    constructor()
        mTokenPermissioned(
            keccak256("M_TOKEN_MANAGER_ROLE"),
            keccak256("M_TOKEN_TEST_MINT_OPERATOR_ROLE"),
            keccak256("M_TOKEN_TEST_BURN_OPERATOR_ROLE"),
            keccak256("M_TOKEN_TEST_GREENLISTED_ROLE")
        )
    {}

    function _disableInitializers() internal override {}
}
