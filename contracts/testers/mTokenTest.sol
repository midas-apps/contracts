// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../mToken.sol";

//solhint-disable contract-name-camelcase
contract mTokenTest is mToken {
    constructor(
        bytes32 _managerRole,
        bytes32 _mintOperatorRole,
        bytes32 _burnOperatorRole,
        bytes32 _greenlistedRole,
        bytes32 _minBalanceExemptRole
    )
        mToken(
            _managerRole,
            _mintOperatorRole,
            _burnOperatorRole,
            _greenlistedRole,
            _minBalanceExemptRole
        )
    {}

    function _disableInitializers() internal override {}

    function _onlyProxyAdmin() internal view override {}
}
