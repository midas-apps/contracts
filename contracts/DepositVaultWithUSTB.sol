// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {ISuperstateToken} from "./interfaces/ustb/ISuperstateToken.sol";

import "./DepositVault.sol";

/**
 * @title DepositVaultWithUSTB
 * @notice Smart contract that handles mTBILL minting and invests
 * proceeds into USTB
 * @author RedDuck Software
 */
contract DepositVaultWithUSTB is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice USTB token address
     */
    address public ustb;

    /**
     * @notice Whether USTB deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public ustbDepositsEnabled;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when `ustbDepositsEnabled` flag is updated
     * @param enabled Whether USTB deposits are enabled
     */
    event SetUstbDepositsEnabled(bool indexed enabled);

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
     * @param _ustb USTB token address
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
        address _ustb
    ) external initializer {
        __DepositVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _minMTokenAmountForFirstDeposit
        );

        _validateAddress(_ustb, false);

        ustb = _ustb;
    }

    /**
     * @notice Updates `ustbDepositsEnabled` value
     * @param enabled whether USTB deposits are enabled
     */
    function setUstbDepositsEnabled(bool enabled) external onlyVaultAdmin {
        ustbDepositsEnabled = enabled;
        emit SetUstbDepositsEnabled(enabled);
    }

    /**
     * @dev overrides original transfer to tokens receiver function
     * in case of USTB deposits are disabled or invest token is not supported
     * by USTB, it will act as the original transfer
     * otherwise it will take payment tokens from user, invest them into USTB
     * and will transfer USTB to tokens receiver
     *
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (
            !ustbDepositsEnabled ||
            ISuperstateToken(ustb)
                .supportedStablecoins(tokenIn)
                .sweepDestination ==
            address(0)
        ) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        address ustbToken = ustb;
        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(ustbToken, transferredAmount);
        ISuperstateToken(ustbToken).subscribe(
            tokensReceiver,
            transferredAmount,
            tokenIn
        );
    }
}
