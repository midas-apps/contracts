// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {Module} from "@gnosis-guild/zodiac-core/contracts/core/Module.sol";
import {Operation} from "@gnosis-guild/zodiac-core/contracts/core/Operation.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable as IERC721} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

/**
 * @title TokensWithdrawModule
 * @notice Module that allows to withdraw tokens from the Safe bypassing the quorum and timelock
 * @author RedDuck Software
 */
contract TokensWithdrawModule is Module {
    /**
     * @notice enum that describes the type of token to withdraw
     */
    enum TokenType {
        ERC20,
        ERC721
    }

    /**
     * @notice struct that describes the parameters of a token to withdraw
     * @param token token address
     * @param tokenType type of the token
     * @param value value of the token (amount for ERC20, tokenId for ERC721)
     */
    struct WithdrawTokenParams {
        address token;
        TokenType tokenType;
        uint256 value;
    }

    /**
     * @notice address to which tokens will be withdrawn
     */
    address public tokensReceiver;

    /**
     * @notice address that can withdraw tokens
     */
    address public tokensWithdrawer;

    /**
     * @notice event emitted when a token is withdrawn
     * @param caller caller address
     * @param token token address
     * @param withdrawTo address to which tokens were withdrawn
     * @param value value of the token (amount for ERC20, tokenId for ERC721)
     */
    event TokenWithdraw(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 value
    );

    /**
     * @notice event emitted when the `tokensReceiver` is set
     * @param previousTokensReceiver previous `tokensReceiver` address
     * @param newTokensReceiver new `tokensReceiver` address
     */
    event TokensReceiverSet(
        address indexed previousTokensReceiver,
        address indexed newTokensReceiver
    );

    /**
     * @notice event emitted when the `tokensWithdrawer` is set
     * @param previousTokensWithdrawer previous `tokensWithdrawer` address
     * @param newTokensWithdrawer new `tokensWithdrawer` address
     */
    event TokensWithdrawerSet(
        address indexed previousTokensWithdrawer,
        address indexed newTokensWithdrawer
    );

    /**
     * @notice error thrown when a caller is not the `tokensWithdrawer`
     * @param caller caller address
     */
    error NotTokensWithdrawer(address caller);

    /**
     * @notice error thrown when a safe transaction execution fails
     */
    error ExecuteFail();

    constructor(
        address _tokensReceiver,
        address _tokensWithdrawer,
        address _target,
        address _avatar
    ) {
        bytes memory initParams = abi.encode(
            _tokensReceiver,
            _tokensWithdrawer,
            _avatar,
            _target
        );
        setUp(initParams);
    }

    /**
     * @notice initializes the module
     * @param initParams encoded initialization parameters
     */
    function setUp(bytes memory initParams) public override initializer {
        (
            address _tokensReceiver,
            address _tokensWithdrawer,
            address _target,
            address _avatar
        ) = abi.decode(initParams, (address, address, address, address));
        _transferOwnership(_avatar);

        avatar = _avatar;
        target = _target;
        tokensReceiver = _tokensReceiver;
        tokensWithdrawer = _tokensWithdrawer;
    }

    /**
     * @notice sets the address to which tokens will be withdrawn
     * @param _tokensReceiver new `tokensReceiver` address
     */
    function setTokensReceiver(address _tokensReceiver) external onlyOwner {
        address previousTokensReceiver = tokensReceiver;
        tokensReceiver = _tokensReceiver;
        emit TokensReceiverSet(previousTokensReceiver, _tokensReceiver);
    }

    /**
     * @notice sets the address that can withdraw tokens
     * @param _tokensWithdrawer new `tokensWithdrawer` address
     */
    function setTokensWithdrawer(address _tokensWithdrawer) external onlyOwner {
        address previousTokensWithdrawer = tokensWithdrawer;
        tokensWithdrawer = _tokensWithdrawer;
        emit TokensWithdrawerSet(previousTokensWithdrawer, _tokensWithdrawer);
    }

    /**
     * @notice withdraws tokens from the Safe to a `tokensReceiver` address
     * @param tokens tokens to withdraw
     */
    function withdrawTokens(WithdrawTokenParams[] calldata tokens) external {
        if (msg.sender != tokensWithdrawer) {
            revert NotTokensWithdrawer(msg.sender);
        }

        address _tokensReceiver = tokensReceiver;

        for (uint256 i = 0; i < tokens.length; i++) {
            WithdrawTokenParams memory params = tokens[i];
            if (params.tokenType == TokenType.ERC20) {
                _execute(
                    params.token,
                    0,
                    abi.encodeWithSelector(
                        IERC20.transfer.selector,
                        _tokensReceiver,
                        params.value
                    ),
                    Operation.Call
                );
            } else if (params.tokenType == TokenType.ERC721) {
                _execute(
                    params.token,
                    0,
                    abi.encodeWithSignature(
                        "safeTransferFrom(address,address,uint256)",
                        avatar,
                        _tokensReceiver,
                        params.value
                    ),
                    Operation.Call
                );
            }

            emit TokenWithdraw(
                msg.sender,
                params.token,
                _tokensReceiver,
                params.value
            );
        }
    }

    /**
     * @dev internal function to execute a transaction on target and revert if it fails
     * @param to destination address
     * @param value value of the transaction
     * @param data data of the transaction
     * @param operation operation type
     */
    function _execute(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) internal {
        if (!exec(to, value, data, operation)) {
            revert ExecuteFail();
        }
    }
}
