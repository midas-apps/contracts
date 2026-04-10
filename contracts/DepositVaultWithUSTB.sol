// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ISuperstateToken} from "./interfaces/ustb/ISuperstateToken.sol";
import {CommonVaultInitParams, CommonVaultV2InitParams} from "./interfaces/IManageableVault.sol";
import {DepositVault} from "./DepositVault.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title DepositVaultWithUSTB
 * @notice Smart contract that handles mToken minting and invests
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
     * @param _commonVaultInitParams init params for common vault
     * @param _commonVaultV2InitParams init params for common vault v2
     * @param _minMTokenAmountForFirstDeposit min amount for first deposit in mToken
     * @param _ustb USTB token address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        CommonVaultV2InitParams calldata _commonVaultV2InitParams,
        uint256 _minMTokenAmountForFirstDeposit,
        uint256 _maxSupplyCap,
        address _ustb
    ) external {
        initialize(
            _commonVaultInitParams,
            _commonVaultV2InitParams,
            _minMTokenAmountForFirstDeposit,
            _maxSupplyCap
        );

        _validateAddress(_ustb, false);

        ustb = _ustb;
    }

    /**
     * @notice Updates `ustbDepositsEnabled` value
     * @param enabled whether USTB deposits are enabled
     */
    function setUstbDepositsEnabled(bool enabled)
        external
        validateVaultAdminAccess
    {
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
    ) internal virtual override {
        if (!ustbDepositsEnabled) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        ISuperstateToken.StablecoinConfig memory config = ISuperstateToken(ustb)
            .supportedStablecoins(tokenIn);

        require(
            config.sweepDestination != address(0),
            "DVU: unsupported USTB token"
        );

        require(config.fee == 0, "DVU: USTB fee is not 0");

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
