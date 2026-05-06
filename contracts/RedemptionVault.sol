// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mToken redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using Counters for Counters.Counter;

    /**
     * @notice return data of _calcAndValidateRedeem
     * packed into a struct to avoid stack too deep errors
     */
    struct CalcAndValidateRedeemResult {
        /// @notice fee amount in mToken
        uint256 feeAmount;
        /// @notice amount of mToken without fee
        uint256 amountMTokenWithoutFee;
    }

    /**
     * @dev default role that grants admin rights to the contract
     */
    bytes32 private constant _DEFAULT_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @dev selector for redeem instant
     */
    bytes4 private constant _REDEEM_INSTANT_SELECTOR =
        bytes4(keccak256("redeemInstant(address,uint256,uint256)"));

    /**
     * @dev selector for redeem instant with custom recipient
     */
    bytes4 private constant _REDEEM_INSTANT_WITH_CUSTOM_RECIPIENT_SELECTOR =
        bytes4(keccak256("redeemInstant(address,uint256,uint256,address)"));

    /**
     * @dev selector for redeem request
     */
    bytes4 private constant _REDEEM_REQUEST_SELECTOR =
        bytes4(keccak256("redeemRequest(address,uint256)"));

    /**
     * @dev selector for redeem request with custom recipient
     */
    bytes4 private constant _REDEEM_REQUEST_WITH_CUSTOM_RECIPIENT_SELECTOR =
        bytes4(keccak256("redeemRequest(address,uint256,address)"));

    /**
     * @notice min amount for fiat requests
     */
    uint256 public minFiatRedeemAmount;

    /**
     * @notice fee percent for fiat requests
     */
    uint256 public fiatAdditionalFee;

    /**
     * @notice static fee in mToken for fiat requests
     */
    uint256 public fiatFlatFee;

    /**
     * @notice mapping, requestId to request data
     */
    mapping(uint256 => Request) public redeemRequests;

    /**
     * @notice address is designated for standard redemptions, allowing tokens to be pulled from this address
     */
    address public requestRedeemer;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _requestRedeemer address is designated for standard redemptions, allowing tokens to be pulled from this address
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer
    ) external initializer {
        __RedemptionVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _fiatRedemptionInitParams,
            _requestRedeemer
        );
    }

    // solhint-disable func-name-mixedcase
    function __RedemptionVault_init(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer
    ) internal onlyInitializing {
        __ManageableVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount
        );
        _validateFee(_fiatRedemptionInitParams.fiatAdditionalFee, false);
        _validateAddress(_requestRedeemer, false);

        minFiatRedeemAmount = _fiatRedemptionInitParams.minFiatRedeemAmount;
        fiatAdditionalFee = _fiatRedemptionInitParams.fiatAdditionalFee;
        fiatFlatFee = _fiatRedemptionInitParams.fiatFlatFee;
        requestRedeemer = _requestRedeemer;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    ) external whenFnNotPaused(_REDEEM_INSTANT_SELECTOR) {
        _validateUserAccess(msg.sender);

        (
            CalcAndValidateRedeemResult memory calcResult,
            uint256 amountTokenOutWithoutFee
        ) = _redeemInstant(
                tokenOut,
                amountMTokenIn,
                minReceiveAmount,
                msg.sender
            );

        emit RedeemInstant(
            msg.sender,
            tokenOut,
            amountMTokenIn,
            calcResult.feeAmount,
            amountTokenOutWithoutFee
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    ) external whenFnNotPaused(_REDEEM_INSTANT_WITH_CUSTOM_RECIPIENT_SELECTOR) {
        _validateUserAccess(msg.sender);

        if (recipient != msg.sender) {
            _validateUserAccess(recipient);
        }

        (
            CalcAndValidateRedeemResult memory calcResult,
            uint256 amountTokenOutWithoutFee
        ) = _redeemInstant(
                tokenOut,
                amountMTokenIn,
                minReceiveAmount,
                recipient
            );

        emit RedeemInstantWithCustomRecipient(
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            calcResult.feeAmount,
            amountTokenOutWithoutFee
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        whenFnNotPaused(_REDEEM_REQUEST_SELECTOR)
        returns (
            uint256 /*requestId*/
        )
    {
        _validateUserAccess(msg.sender);

        (
            uint256 requestId,
            CalcAndValidateRedeemResult memory calcResult
        ) = _redeemRequest(tokenOut, amountMTokenIn, false, msg.sender);

        emit RedeemRequest(
            requestId,
            msg.sender,
            tokenOut,
            amountMTokenIn,
            calcResult.feeAmount
        );

        return requestId;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient
    )
        external
        whenFnNotPaused(_REDEEM_REQUEST_WITH_CUSTOM_RECIPIENT_SELECTOR)
        returns (
            uint256 /*requestId*/
        )
    {
        _validateUserAccess(msg.sender);

        if (recipient != msg.sender) {
            _validateUserAccess(recipient);
        }

        (
            uint256 requestId,
            CalcAndValidateRedeemResult memory calcResult
        ) = _redeemRequest(tokenOut, amountMTokenIn, false, recipient);

        emit RedeemRequestWithCustomRecipient(
            requestId,
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            calcResult.feeAmount
        );

        return requestId;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemFiatRequest(uint256 amountMTokenIn)
        external
        whenFnNotPaused(this.redeemFiatRequest.selector)
        returns (
            uint256 /*requestId*/
        )
    {
        _validateUserAccess(msg.sender);

        (
            uint256 requestId,
            CalcAndValidateRedeemResult memory calcResult
        ) = _redeemRequest(
                MANUAL_FULLFILMENT_TOKEN,
                amountMTokenIn,
                true,
                msg.sender
            );

        emit RedeemRequest(
            requestId,
            msg.sender,
            MANUAL_FULLFILMENT_TOKEN,
            amountMTokenIn,
            calcResult.feeAmount
        );

        return requestId;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        onlyVaultAdmin
    {
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 rate = redeemRequests[requestIds[i]].mTokenRate;
            bool success = _approveRequest(requestIds[i], rate, true, true);

            if (!success) {
                continue;
            }

            emit SafeApproveRequest(requestIds[i], rate);
        }
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external {
        uint256 currentMTokenRate = _getMTokenRate();
        safeBulkApproveRequest(requestIds, currentMTokenRate);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        onlyVaultAdmin
    {
        _approveRequest(requestId, newMTokenRate, false, false);

        emit ApproveRequest(requestId, newMTokenRate);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        onlyVaultAdmin
    {
        _approveRequest(requestId, newMTokenRate, true, false);

        emit SafeApproveRequest(requestId, newMTokenRate);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        redeemRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setMinFiatRedeemAmount(uint256 newValue) external onlyVaultAdmin {
        minFiatRedeemAmount = newValue;

        emit SetMinFiatRedeemAmount(msg.sender, newValue);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setFiatFlatFee(uint256 feeInMToken) external onlyVaultAdmin {
        fiatFlatFee = feeInMToken;

        emit SetFiatFlatFee(msg.sender, feeInMToken);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setFiatAdditionalFee(uint256 newFee) external onlyVaultAdmin {
        _validateFee(newFee, false);

        fiatAdditionalFee = newFee;

        emit SetFiatAdditionalFee(msg.sender, newFee);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setRequestRedeemer(address redeemer) external onlyVaultAdmin {
        _validateAddress(redeemer, false);

        requestRedeemer = redeemer;

        emit SetRequestRedeemer(msg.sender, redeemer);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) public onlyVaultAdmin {
        for (uint256 i = 0; i < requestIds.length; i++) {
            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
                true
            );

            if (!success) {
                continue;
            }

            emit SafeApproveRequest(requestIds[i], newOutRate);
        }
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return _DEFAULT_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistTogglerRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return vaultRole();
    }

    /**
     * @dev validates approve
     * burns amount from contract
     * transfer tokenOut to user if not fiat
     * sets flag Processed
     * @param requestId request id
     * @param newMTokenRate new mToken rate
     * @param isSafe new mToken rate
     * @param safeValidateLiquidity if true, checks if there is enough liquidity
     * and if its not sufficient, function wont fail
     *
     * @return success true if success, false only in case if
     * safeValidateLiquidity == true and there is not enough liquidity
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newMTokenRate,
        bool isSafe,
        bool safeValidateLiquidity
    )
        internal
        returns (
            bool /* success */
        )
    {
        Request memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        if (isSafe) {
            _requireVariationTolerance(request.mTokenRate, newMTokenRate);
        }

        bool isFiat = request.tokenOut == MANUAL_FULLFILMENT_TOKEN;

        uint256 tokenDecimals = isFiat ? 18 : _tokenDecimals(request.tokenOut);

        uint256 amountTokenOutWithoutFee = _truncate(
            (request.amountMToken * newMTokenRate) / request.tokenOutRate,
            tokenDecimals
        );

        if (!isFiat) {
            if (
                safeValidateLiquidity &&
                !_validateLiquidity(
                    request.tokenOut,
                    amountTokenOutWithoutFee,
                    tokenDecimals
                )
            ) {
                return false;
            }

            _tokenTransferFromTo(
                request.tokenOut,
                requestRedeemer,
                request.sender,
                amountTokenOutWithoutFee,
                tokenDecimals
            );
        }

        _requireAndUpdateAllowance(request.tokenOut, amountTokenOutWithoutFee);

        mToken.burn(address(this), request.amountMToken);

        request.status = RequestStatus.Processed;
        request.mTokenRate = newMTokenRate;
        redeemRequests[requestId] = request;

        return true;
    }

    /**
     * @notice validates request
     * if exist
     * if not processed
     * @param sender sender address
     * @param status request status
     */
    function _validateRequest(address sender, RequestStatus status)
        internal
        pure
    {
        require(sender != address(0), "RV: request not exist");
        require(status == RequestStatus.Pending, "RV: request not pending");
    }

    /**
     * @dev internal redeem instant logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param minReceiveAmount min amount of tokenOut to receive (decimals 18)
     * @param recipient recipient address
     *
     * @return calcResult calculated redeem result
     * @return amountTokenOutWithoutFee amount of tokenOut without fee
     */
    function _redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    )
        internal
        virtual
        returns (
            CalcAndValidateRedeemResult memory calcResult,
            uint256 amountTokenOutWithoutFee
        )
    {
        address user = msg.sender;

        calcResult = _calcAndValidateRedeem(
            user,
            tokenOut,
            amountMTokenIn,
            true,
            false
        );

        _requireAndUpdateLimit(amountMTokenIn);

        address tokenOutCopy = tokenOut;
        uint256 tokenDecimals = _tokenDecimals(tokenOutCopy);

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenIn
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOutCopy
        );

        amountTokenOutWithoutFee = _truncate(
            (calcResult.amountMTokenWithoutFee * mTokenRate) / tokenOutRate,
            tokenDecimals
        );

        require(
            amountTokenOutWithoutFee >= minReceiveAmount,
            "RV: minReceiveAmount > actual"
        );

        _requireAndUpdateAllowance(tokenOutCopy, amountTokenOut);

        mToken.burn(user, calcResult.amountMTokenWithoutFee);
        if (calcResult.feeAmount > 0)
            _tokenTransferFromUser(
                address(mToken),
                feeReceiver,
                calcResult.feeAmount,
                18
            );

        _tokenTransferToUser(
            tokenOutCopy,
            recipient,
            amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @notice internal redeem request logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     *
     * @return requestId request id
     * @return calcResult calc result
     */
    function _redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        bool isFiat,
        address recipient
    )
        internal
        returns (
            uint256 requestId,
            CalcAndValidateRedeemResult memory calcResult
        )
    {
        if (!isFiat) {
            require(
                tokenOut != MANUAL_FULLFILMENT_TOKEN,
                "RV: tokenOut == fiat"
            );
        }

        address user = msg.sender;

        calcResult = _calcAndValidateRedeem(
            user,
            tokenOut,
            amountMTokenIn,
            false,
            isFiat
        );

        address tokenOutCopy = tokenOut;

        // assigning the default value which is gonna be used
        // only for fiat redemptions
        uint256 tokenOutRate = 1e18;

        if (!isFiat) {
            TokenConfig storage config = tokensConfig[tokenOutCopy];
            tokenOutRate = _getTokenRate(config.dataFeed, config.stable);
        }

        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();

        _tokenTransferFromUser(
            address(mToken),
            address(this),
            calcResult.amountMTokenWithoutFee,
            18 // mToken always have 18 decimals
        );
        if (calcResult.feeAmount > 0)
            _tokenTransferFromUser(
                address(mToken),
                feeReceiver,
                calcResult.feeAmount,
                18
            );

        requestId = currentRequestId.current();
        currentRequestId.increment();

        redeemRequests[requestId] = Request({
            sender: recipient,
            tokenOut: tokenOutCopy,
            status: RequestStatus.Pending,
            amountMToken: calcResult.amountMTokenWithoutFee,
            mTokenRate: mTokenRate,
            tokenOutRate: tokenOutRate
        });

        return (requestId, calcResult);
    }

    /**
     * @dev calculates tokenOut amount from USD amount
     * @param amountUsd amount of USD (decimals 18)
     * @param tokenOut tokenOut address
     *
     * @return amountToken converted USD to tokenOut
     * @return tokenRate conversion rate
     */
    function _convertUsdToToken(uint256 amountUsd, address tokenOut)
        internal
        view
        returns (uint256 amountToken, uint256 tokenRate)
    {
        require(amountUsd > 0, "RV: amount zero");

        TokenConfig storage tokenConfig = tokensConfig[tokenOut];

        tokenRate = _getTokenRate(tokenConfig.dataFeed, tokenConfig.stable);
        require(tokenRate > 0, "RV: rate zero");

        amountToken = (amountUsd * (10**18)) / tokenRate;
    }

    /**
     * @dev calculates USD amount from mToken amount
     * @param amountMToken amount of mToken (decimals 18)
     *
     * @return amountUsd converted amount to USD
     * @return mTokenRate conversion rate
     */
    function _convertMTokenToUsd(uint256 amountMToken)
        internal
        view
        returns (uint256 amountUsd, uint256 mTokenRate)
    {
        require(amountMToken > 0, "RV: amount zero");

        mTokenRate = _getMTokenRate();

        amountUsd = (amountMToken * mTokenRate) / (10**18);
    }

    /**
     * @dev validate redeem and calculate fee
     * @param user user address
     * @param tokenOut tokenOut address
     * @param amountMTokenIn mToken amount (decimals 18)
     * @param isInstant is instant operation
     * @param isFiat is fiat operation
     *
     * @return result calc result
     */
    function _calcAndValidateRedeem(
        address user,
        address tokenOut,
        uint256 amountMTokenIn,
        bool isInstant,
        bool isFiat
    ) internal view returns (CalcAndValidateRedeemResult memory result) {
        require(amountMTokenIn > 0, "RV: invalid amount");

        if (!isFreeFromMinAmount[user]) {
            uint256 minRedeemAmount = isFiat ? minFiatRedeemAmount : minAmount;
            require(minRedeemAmount <= amountMTokenIn, "RV: amount < min");
        }

        result.feeAmount = _getFeeAmount(
            user,
            tokenOut,
            amountMTokenIn,
            isInstant,
            isFiat ? fiatAdditionalFee : 0
        );

        if (isFiat) {
            require(
                tokenOut == MANUAL_FULLFILMENT_TOKEN,
                "RV: tokenOut != fiat"
            );
            if (!waivedFeeRestriction[user]) result.feeAmount += fiatFlatFee;
        } else {
            _requireTokenExists(tokenOut);
        }

        require(amountMTokenIn > result.feeAmount, "RV: amountMTokenIn < fee");

        result.amountMTokenWithoutFee = amountMTokenIn - result.feeAmount;
    }

    /*
     * @dev validates that liquidity of provided token on `requestRedeemer` is enough
     * @param token token address
     * @param requiredLiquidity minimum required liquidity of `requestRedeemer`
     * @param tokenDecimals `token` decimals
     *
     * @return false if not enough liquidity, otherwise true
     */
    function _validateLiquidity(
        address token,
        uint256 requiredLiquidity,
        uint256 tokenDecimals
    )
        internal
        view
        returns (
            bool /* success */
        )
    {
        uint256 balance = IERC20(token).balanceOf(requestRedeemer);
        return balance >= requiredLiquidity.convertFromBase18(tokenDecimals);
    }

    /**
     * @dev gets and validates mToken rate
     * @return mTokenRate mToken rate
     */
    function _getMTokenRate() private view returns (uint256 mTokenRate) {
        mTokenRate = _getTokenRate(address(mTokenDataFeed), false);
        require(mTokenRate > 0, "RV: rate zero");
    }
}
