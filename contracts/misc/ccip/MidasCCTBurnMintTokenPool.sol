// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {IBurnMintERC20} from "@chainlink/contracts-ccip/contracts/interfaces/IBurnMintERC20.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {BurnMintTokenPoolAbstract} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPoolAbstract.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";
import {IMToken} from "../../interfaces/IMToken.sol";

/**
 * @title MidasCCTBurnMintTokenPool
 * @notice BurnMintTokenPool implementation for Midas mTokens
 * @author RedDuck Software
 */
contract MidasCCTBurnMintTokenPool is BurnMintTokenPool {
    /**
     * @notice The receiver of the tokens if user mint fails
     */
    address public fallbackReceiver;

    /**
     * @param newFallbackReceiver The new fallback receiver
     */
    event FallbackReceiverSet(address indexed newFallbackReceiver);

    /**
     * @param originalReceiver The original receiver of the tokens
     * @param fallbackReceiver The fallback receiver of the tokens
     * @param amount The amount of tokens
     * @param error The error that occurred
     */
    event FallbackHit(
        address indexed originalReceiver,
        address indexed fallbackReceiver,
        uint256 amount,
        bytes error
    );

    constructor(
        IMToken token,
        address rmnProxy,
        address router,
        address initFallbackReceiver
    )
        BurnMintTokenPool(
            IBurnMintERC20(address(token)),
            18,
            address(0),
            rmnProxy,
            router
        )
    {
        _setFallbackReceiver(initFallbackReceiver);
    }

    /**
     * @notice Set the fallback receiver of the pool
     * @param newFallbackReceiver The new fallback receiver
     */
    function setFallbackReceiver(address newFallbackReceiver)
        external
        onlyOwner
    {
        _setFallbackReceiver(newFallbackReceiver);
    }

    /**
     * @inheritdoc TokenPool
     */
    function _lockOrBurn(uint64, uint256 amount) internal virtual override {
        IMToken(address(i_token)).burn(address(this), amount);
    }

    /**
     * @inheritdoc BurnMintTokenPoolAbstract
     */
    function _releaseOrMint(
        address receiver,
        uint256 amount,
        uint64 /* remoteChainSelector */
    ) internal virtual override {
        try this.releaseOrMintInternal(receiver, amount) {} catch (
            bytes memory error
        ) {
            _mint(fallbackReceiver, amount);
            emit FallbackHit(receiver, fallbackReceiver, amount, error);
        }
    }

    /**
     * @notice Mint the tokens to the receiver
     * @dev Only callable by the contract itself
     * @param receiver The receiver of the tokens
     * @param amount The amount of tokens
     */
    function releaseOrMintInternal(address receiver, uint256 amount) external {
        require(msg.sender == address(this), "not self");
        _mint(receiver, amount);
    }

    /**
     * @notice Mint the tokens to the receiver
     * @param receiver The receiver of the tokens
     * @param amount The amount of tokens
     */
    function _mint(address receiver, uint256 amount) internal {
        IMToken(address(i_token)).mint(receiver, amount);
    }

    function _setFallbackReceiver(address newFallbackReceiver) internal {
        require(newFallbackReceiver != address(0), "MCCT: address zero");
        fallbackReceiver = newFallbackReceiver;
        emit FallbackReceiverSet(newFallbackReceiver);
    }
}
