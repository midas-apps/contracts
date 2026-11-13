// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {RedemptionVault} from "./RedemptionVault.sol";
import {RedemptionVaultInitParams} from "./interfaces/IRedemptionVault.sol";
import {IDepositVault} from "./interfaces/IDepositVault.sol";
import {CommonVaultInitParams} from "./interfaces/IManageableVault.sol";
import {IUSYCTeller} from "./interfaces/usyc/IUSYCTeller.sol";

import {VaultsWithUSYCLibrary} from "./libraries/VaultsWithUSYCLibrary.sol";

/**
 * @title RedemptionVaultWithUSYC
 * @notice Smart contract that handles redemptions using USYC
 * redeemed through the Circle USYC Teller
 * @dev When the vault lacks tokenOut, USYC held by the vault is redeemed
 * to USDC. If tokenOut is the mToken of `depositVault`, the USDC is
 * deposited there and the minted mToken is used instead
 * @author RedDuck Software
 */
contract RedemptionVaultWithUSYC is RedemptionVault {
    /**
     * @notice Circle USYC Teller used to redeem USYC
     * @dev `asset()` is the token USYC is redeemed to (USDC),
     * `share()` is USYC
     */
    IUSYCTeller public usycTeller;

    /**
     * @notice mToken DepositVault used to convert USDC into its mToken
     * after redeeming USYC
     * @dev if not set, USYC is only used for USDC redemptions
     */
    IDepositVault public depositVault;

    /**
     * @notice Redemption fee rate the Teller is expected to charge this vault
     * @dev USYC is only redeemed when it equals
     * `usycTeller.redemptionFeeRate(address(this))` and the fee the Teller
     * actually takes from the redeemed USDC does not exceed it. The Teller
     * charges no fee under its daily free tier, so the actual fee can be lower
     */
    uint256 public anticipatedFeeRate;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the USYC Teller address is updated
     * @param newTeller new USYC Teller address
     */
    event SetUsycTeller(address indexed newTeller);

    /**
     * @notice Emitted when the mToken DepositVault address is updated
     * @param newVault new mToken DepositVault address
     */
    event SetDepositVault(address indexed newVault);

    /**
     * @notice Emitted when `anticipatedFeeRate` is updated
     * @param feeRate new anticipated redemption fee rate
     */
    event SetAnticipatedFeeRate(uint256 feeRate);

    /**
     * @notice Passes role identifiers to the base RedemptionVault constructor
     * @param _contractAdminRole contract admin role identifier
     * @param _greenlistedRole greenlisted role identifier
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole)
        RedemptionVault(_contractAdminRole, _greenlistedRole)
    {}

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _usycTeller USYC Teller address
     * @param _depositVault mToken DepositVault address, can be zero
     * @param _anticipatedFeeRate anticipated Teller redemption fee rate
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionInitParams,
        address _usycTeller,
        address _depositVault,
        uint256 _anticipatedFeeRate
    ) external {
        initialize(_commonVaultInitParams, _redemptionInitParams);
        _validateAddress(_usycTeller, false);

        usycTeller = IUSYCTeller(_usycTeller);
        depositVault = IDepositVault(_depositVault);

        anticipatedFeeRate = _anticipatedFeeRate;
    }

    /**
     * @notice Sets the mToken DepositVault address
     * @dev zero address disables USYC usage for mToken redemptions
     * @param _depositVault new mToken DepositVault address
     */
    function setDepositVault(address _depositVault) external onlyContractAdmin {
        depositVault = IDepositVault(_depositVault);
        emit SetDepositVault(_depositVault);
    }

    /**
     * @notice Sets the USYC Teller address
     * @param _usycTeller new USYC Teller address
     */
    function setUsycTeller(address _usycTeller) external onlyContractAdmin {
        _validateAddress(_usycTeller, false);
        usycTeller = IUSYCTeller(_usycTeller);
        emit SetUsycTeller(_usycTeller);
    }

    /**
     * @notice Updates `anticipatedFeeRate` value
     * @param _feeRate new anticipated redemption fee rate
     */
    function setAnticipatedFeeRate(uint256 _feeRate)
        external
        onlyContractAdmin
    {
        anticipatedFeeRate = _feeRate;
        emit SetAnticipatedFeeRate(_feeRate);
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, redeem USYC through the Teller to cover the missing amount
     * @dev See {VaultsWithUSYCLibrary-obtainRedemptionLiquidity}
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param tokenOutDecimals decimals of tokenOut
     * @return obtained amount of tokenOut in base 18
     */
    function _obtainVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 tokenOutRate,
        uint256, /* currentTokenOutBalanceBase18 */
        uint256 tokenOutDecimals
    )
        internal
        virtual
        override
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return
            VaultsWithUSYCLibrary.obtainRedemptionLiquidity(
                usycTeller,
                depositVault,
                anticipatedFeeRate,
                tokenOut,
                missingAmountBase18,
                tokenOutRate,
                tokenOutDecimals
            );
    }
}
