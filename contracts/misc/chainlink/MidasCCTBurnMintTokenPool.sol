// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IBurnMintERC20} from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";
import {IMToken} from "../../interfaces/IMToken.sol";

contract MidasCCTBurnMintTokenPool is BurnMintTokenPool {
    constructor(
        IMToken token,
        address[] memory allowlist,
        address rmnProxy,
        address router
    )
        BurnMintTokenPool(
            IBurnMintERC20(address(token)),
            18,
            allowlist,
            rmnProxy,
            router
        )
    {}

    /**
     * @inheritdoc TokenPool
     */
    function _lockOrBurn(uint256 amount) internal virtual override {
        IMToken(address(i_token)).burn(address(this), amount);
    }
}
