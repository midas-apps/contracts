// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./DepositVault.sol";
import "./interfaces/aave/IAaveV3Pool.sol";

/**
 * @title DepositVaultWithAave
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into Aave V3 Pool
 * @dev If `aaveDepositsEnabled` is false, regular deposit flow is used
 * @author RedDuck Software
 */
contract DepositVaultWithAave is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Aave V3 Pool contract address
     */
    IAaveV3Pool public aavePool;

    /**
     * @notice Whether Aave auto-invest deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public aaveDepositsEnabled;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the Aave Pool address is updated
     * @param caller address of the caller
     * @param newPool new Aave Pool address
     */
    event SetAavePool(address indexed caller, address indexed newPool);

    /**
     * @notice Emitted when `aaveDepositsEnabled` flag is updated
     * @param enabled Whether Aave deposits are enabled
     */
    event SetAaveDepositsEnabled(bool indexed enabled);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations in mToken
     * @param _minMTokenAmountForFirstDeposit min amount for first deposit in mToken
     * @param _maxSupplyCap max supply cap for mToken
     * @param _aavePool Aave V3 Pool contract address
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        uint256 _minMTokenAmountForFirstDeposit,
        uint256 _maxSupplyCap,
        address _aavePool
    ) external {
        initialize(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _minMTokenAmountForFirstDeposit,
            _maxSupplyCap
        );

        _validateAddress(_aavePool, false);
        aavePool = IAaveV3Pool(_aavePool);
    }

    /**
     * @notice Sets the Aave V3 Pool address
     * @param _aavePool new Aave V3 Pool address
     */
    function setAavePool(address _aavePool) external onlyVaultAdmin {
        _validateAddress(_aavePool, false);
        aavePool = IAaveV3Pool(_aavePool);
        emit SetAavePool(msg.sender, _aavePool);
    }

    /**
     * @notice Updates `aaveDepositsEnabled` value
     * @param enabled whether Aave auto-invest deposits are enabled
     */
    function setAaveDepositsEnabled(bool enabled) external onlyVaultAdmin {
        aaveDepositsEnabled = enabled;
        emit SetAaveDepositsEnabled(enabled);
    }

    /**
     * @dev overrides original transfer to tokens receiver function
     * in case of Aave deposits are disabled, it will act as the original transfer
     * otherwise it will take payment tokens from user, supply them to Aave V3 Pool
     * and aTokens will be minted to tokens receiver
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (!aaveDepositsEnabled) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(
            address(aavePool),
            transferredAmount
        );
        aavePool.supply(tokenIn, transferredAmount, tokensReceiver, 0);
    }
}
