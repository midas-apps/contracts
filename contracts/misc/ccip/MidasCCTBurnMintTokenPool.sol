// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {ERC165CheckerUpgradeable as ERC165Checker} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import {IBurnMintERC20} from "@chainlink/contracts-ccip/contracts/interfaces/IBurnMintERC20.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";
import {IPoolV2} from "@chainlink/contracts-ccip/contracts/interfaces/IPoolV2.sol";
import {Pool} from "@chainlink/contracts-ccip/contracts/libraries/Pool.sol";

import {IMToken} from "../../interfaces/IMToken.sol";
import {IMidasCCTFailedMessageFallback} from "../../interfaces/ccip/IMidasCCTFailedMessageFallback.sol";

/**
 * @title MidasCCTBurnMintTokenPool
 * @notice BurnMintTokenPool implementation for Midas mTokens
 * @author RedDuck Software
 */
contract MidasCCTBurnMintTokenPool is BurnMintTokenPool {
    /**
     * @notice the receiver of the tokens if user mint fails
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
        uint64 remoteChainSelector,
        bool withCallback,
        bytes error
    );

    /**
     * @param originalReceiver The original receiver of the tokens
     * @param fallbackReceiver The fallback receiver of the tokens
     * @param amount The amount of tokens
     * @param error The error that occurred
     */
    event FallbackFail(
        address indexed originalReceiver,
        address indexed fallbackReceiver,
        uint256 amount,
        uint64 remoteChainSelector,
        bytes error
    );

    /**
     * @notice Error thrown when the fallback receiver is set to address zero
     */
    error InvalidFallbackReceiver(address newFallbackReceiver);

    /**
     * @notice Error thrown when the function is called by an address other than the contract itself
     */
    error NotSelf();

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
     * @notice Handle the fallback of the pool
     * @dev Only callable by the contract itself
     * @param receiver The receiver of the tokens
     * @param amount The amount of tokens
     * @param remoteChainSelector The remote chain selector
     * @return _fallbackReceiver The fallback receiver of the tokens
     * @return _withCallback Whether the fallback has a callback
     */
    function handleFallback(
        address receiver,
        uint256 amount,
        uint64 remoteChainSelector
    ) external returns (address _fallbackReceiver, bool _withCallback) {
        _onlySelf();

        _fallbackReceiver = fallbackReceiver;
        _mint(_fallbackReceiver, amount);

        if (
            _fallbackReceiver.code.length > 0 &&
            ERC165Checker.supportsInterface(
                _fallbackReceiver,
                type(IMidasCCTFailedMessageFallback).interfaceId
            )
        ) {
            _withCallback = true;
            IMidasCCTFailedMessageFallback(_fallbackReceiver).onFailedMessage(
                receiver,
                amount,
                remoteChainSelector
            );
        }
    }

    /**
     * @notice Function that mints the tokens to the receiver and
     * can be wrapped with a try/catch to handle errors
     * @dev Only callable by the contract itself
     * @param receiver The receiver of the tokens
     * @param amount The amount of tokens
     */
    function releaseOrMintInternal(address receiver, uint256 amount) external {
        _onlySelf();
        _mint(receiver, amount);
    }

    /**
     * @dev Mints the tokens to the receiver, in case if
     * user mint fails it mints to the fallback receiver
     * @param receiver The original receiver of the tokens
     * @param amount The amount of tokens
     */
    function _releaseOrMint(
        address receiver,
        uint256 amount,
        uint64 remoteChainSelector
    ) internal virtual override {
        try this.releaseOrMintInternal(receiver, amount) {} catch (
            bytes memory err
        ) {
            try
                this.handleFallback(receiver, amount, remoteChainSelector)
            returns (address _fallbackReceiver, bool withCallback) {
                emit FallbackHit(
                    receiver,
                    _fallbackReceiver,
                    amount,
                    remoteChainSelector,
                    withCallback,
                    err
                );
            } catch (bytes memory errFallback) {
                emit FallbackFail(
                    receiver,
                    fallbackReceiver,
                    amount,
                    remoteChainSelector,
                    errFallback
                );
            }
        }
    }

    /**
     * @inheritdoc TokenPool
     */
    function _lockOrBurn(uint64, uint256 amount) internal virtual override {
        IMToken(address(i_token)).burn(address(this), amount);
    }

    /**
     * @dev Mint the tokens to the receiver
     * @param receiver The receiver of the tokens
     * @param amount The amount of tokens
     */
    function _mint(address receiver, uint256 amount) private {
        IMToken(address(i_token)).mint(receiver, amount);
    }

    /**
     * @dev Set the fallback receiver of the pool
     * @param newFallbackReceiver The new fallback receiver
     */
    function _setFallbackReceiver(address newFallbackReceiver) private {
        require(
            newFallbackReceiver != address(0),
            InvalidFallbackReceiver(newFallbackReceiver)
        );
        fallbackReceiver = newFallbackReceiver;
        emit FallbackReceiverSet(newFallbackReceiver);
    }

    /**
     * @dev Check if the caller is the contract itself
     */
    function _onlySelf() private view {
        require(msg.sender == address(this), NotSelf());
    }
}
