// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {RedemptionVault} from "./RedemptionVault.sol";
import {RedemptionVaultInitParams} from "./interfaces/IRedemptionVault.sol";
import {IDepositVault} from "./interfaces/IDepositVault.sol";
import {ManageableVault, TokenConfig} from "./abstract/ManageableVault.sol";
import {CommonVaultInitParams} from "./interfaces/IManageableVault.sol";
import {IDataFeed} from "./interfaces/IDataFeed.sol";
import {IUSYCTeller} from "./interfaces/usyc/IUSYCTeller.sol";

import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {RedemptionVaultWithUSYCLibrary} from "./libraries/RedemptionVaultWithUSYCLibrary.sol";

/**
 * @title RedemptionVaultWithUSYC
 * @notice Smart contract that handles redemptions using USYC
 * @author RedDuck Software
 */
contract RedemptionVaultWithUSYC is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    IUSYCTeller public usycTeller;

    IDepositVault public depositVault;

    uint256 public anticipatedFee;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    event SetUSYCTeller(address _newTeller);

    event SetDepositVault(address _newDepositVault);

    event SetAnticipatedFee(uint256 _fee);

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
     * @param _usycTeller USYC redemption contract address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionInitParams,
        address _usycTeller,
        address _depositVault,
        uint256 _anticipatedFee
    ) external {
        initialize(_commonVaultInitParams, _redemptionInitParams);
        _validateAddress(_usycTeller, false);

        usycTeller = IUSYCTeller(_usycTeller);
        depositVault = IDepositVault(_depositVault);

        anticipatedFee = _anticipatedFee;
    }

    function setDepositVault(address _depositVault) external onlyContractAdmin {
        depositVault = IDepositVault(_depositVault);
        emit SetDepositVault(_depositVault);
    }

    function setUsycTeller(address _teller) external onlyContractAdmin {
        _validateAddress(_teller, false);
        usycTeller = IUSYCTeller(_teller);
        emit SetUSYCTeller(_teller);
    }

    function setAnticipatedFee(uint256 _fee) external onlyContractAdmin {
        anticipatedFee = _fee;
        emit SetAnticipatedFee(_fee);
    }

    /**
     * @notice Check if contract has enough USDC balance for redeem
     * if not, trigger USTB redemption flow to redeem exactly the missing amount
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _obtainVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256, /* tokenOutRate */
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
            RedemptionVaultWithUSYCLibrary.obtainRedemptionLiquidity(
                usycTeller,
                depositVault,
                anticipatedFee,
                tokenOut,
                missingAmountBase18,
                tokenOutDecimals
            );
    }
}
