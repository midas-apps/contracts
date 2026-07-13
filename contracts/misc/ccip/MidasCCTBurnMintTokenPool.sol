// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IBurnMintERC20} from "@chainlink/contracts-ccip/contracts/interfaces/IBurnMintERC20.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";
import {IMToken} from "../../interfaces/IMToken.sol";

/**
 * @title MidasCCTBurnMintTokenPool
 * @notice BurnMintTokenPool implementation for Midas mTokens
 * @author RedDuck Software
 */
contract MidasCCTBurnMintTokenPool is BurnMintTokenPool {
    constructor(
        IMToken token,
        address rmnProxy,
        address router
    )
        BurnMintTokenPool(
            IBurnMintERC20(address(token)),
            18,
            address(0),
            rmnProxy,
            router
        )
    {}

    /**
     * @inheritdoc TokenPool
     */
    function _lockOrBurn(uint64, uint256 amount) internal virtual override {
        IMToken(address(i_token)).burn(address(this), amount);
    }
}
