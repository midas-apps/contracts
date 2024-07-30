// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

import "./access/Greenlistable.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mTBILL redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    /**
     * @notice last redemption request id
     */
    Counters.Counter public lastRequestId;

    uint256 public minFiatRedeemAmount;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    mapping(uint256 => Request) public redeemRequests;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mToken address of mTBILL token
     * @param _tokensReceiver address of mTBILL token receiver
     */
    function initialize(
        address _ac,
        address _mToken,
        address _tokensReceiver,
        address _feeReciever,
        uint256 _initialFee,
        uint256 _initialLimit,
        address _mTokenDataFeed,
        address _sanctionsList,
        uint256 _minCryptoRedeemAmount,
        uint256 _minFiatRedeemAmount,
        uint256 _variationTolerance
    ) external initializer {
        __ManageableVault_init(
            _ac,
            _mToken,
            _tokensReceiver,
            _feeReciever,
            _initialFee,
            _initialLimit,
            _mTokenDataFeed,
            _sanctionsList,
            _variationTolerance,
            _minCryptoRedeemAmount
        );
        minFiatRedeemAmount = _minFiatRedeemAmount;
    }

    function redeemInstant(address tokenOut, uint256 amountMTokenIn)
        external
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        whenNotPaused
    {
        address user = msg.sender;

        (uint256 feeAmount, uint256 amountMTokenWithoutFee) = _calcAndValidateRedeem(user, tokenOut, amountMTokenIn, true, false);

        _requireAndUpdateLimit(amountMTokenIn);

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(amountMTokenIn);
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(amountMTokenInUsd, tokenOut);

        _requireAndUpdateAllowance(tokenOut, amountTokenOut);

        uint256 amountMTokenInCopy = amountMTokenIn;
        address tokenOutCopy = tokenOut;

        mToken.burn(user, amountMTokenWithoutFee);
        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount, 18);

        uint256 amountTokenOutWithoutFee = _truncate((amountMTokenWithoutFee * mTokenRate) / tokenOutRate, tokenDecimals);

        _tokenTransferToUser(tokenOutCopy, user, amountTokenOutWithoutFee, tokenDecimals);

        emit RedeemInstant(user, tokenOutCopy, amountMTokenInCopy, feeAmount, amountTokenOutWithoutFee);
    }

    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        whenNotPaused
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        return _redeemRequest(tokenOut, amountMTokenIn);
    }

    function redeemFiatRequest(uint256 amountMTokenIn)
        external
        whenNotPaused
        onlyGreenlisted(msg.sender)
        onlyNotBlacklisted(msg.sender)
        onlyNotSanctioned(msg.sender)
        returns (uint256 requestId)
    {
        return _redeemRequest(MANUAL_FULLFILMENT_TOKEN, amountMTokenIn);
    }

    function setMinFiatRedeemAmount(uint256 newValue) external onlyVaultAdmin {
        minFiatRedeemAmount = newValue;

        emit SetMinFiatRedeemAmount(msg.sender, newValue);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return REDEMPTION_VAULT_ADMIN_ROLE;
    }

    function _redeemRequest(address tokenOut, uint256 amountMTokenIn)
        internal
        returns (uint256 requestId)
    {
        address user = msg.sender;

        bool isFiat = tokenOut == MANUAL_FULLFILMENT_TOKEN;

        (uint256 feeAmount, uint256 amountMTokenWithoutFee) = _calcAndValidateRedeem(user, tokenOut, amountMTokenIn, false, isFiat);

        TokenConfig storage config = tokensConfig[tokenOut];

        uint256 tokenOutRate = IDataFeed(config.dataFeed).getDataInBase18();
        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();

        _tokenTransferFromUser(address(mToken), address(this), amountMTokenWithoutFee, 18);
        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount, 18);

        lastRequestId.increment();
        requestId = lastRequestId.current();

        redeemRequests[requestId] = Request(
            user,
            tokenOut,
            RequestStatus.Pending,
            amountMTokenWithoutFee,
            mTokenRate,
            tokenOutRate
        );

        emit RedeemRequest(requestId, user, tokenOut, amountMTokenIn);
    }

    function _convertUsdToToken(uint256 amountUsd, address tokenOut)
        internal
        view
        returns (uint256 amountToken, uint256 tokenRate)
    {
        require(amountUsd > 0, "RV: amount zero");

        TokenConfig storage tokenConfig = tokensConfig[tokenOut];

        tokenRate = IDataFeed(tokenConfig.dataFeed).getDataInBase18();
        require(tokenRate > 0, "RV: rate zero");

        amountToken = (amountUsd * (10**18)) / tokenRate;
    }

    function _convertMTokenToUsd(uint256 amountMToken)
        internal
        view
        returns (uint256 amountUsd, uint256 mTokenRate)
    {
        require(amountMToken > 0, "RV: amount zero");

        mTokenRate = mTokenDataFeed.getDataInBase18();
        require(mTokenRate > 0, "RV: rate zero");

        amountUsd = (amountMToken * mTokenRate) / (10**18);
    }

    function _calcAndValidateRedeem(address user, address tokenOut, uint256 amountMTokenIn, bool isInstant, bool isFiat) internal view returns(uint256 feeAmount, uint256 amountMTokenWithoutFee) {
        require(amountMTokenIn > 0, "RV: invalid amount");

        if(!isFreeFromMinAmount[user]){
            uint256 minRedeemAmount = isFiat ? minFiatRedeemAmount : minAmount;
            require(minRedeemAmount <= amountMTokenIn, "RV: amount < min");
        }

        if(isFiat){
            require(tokenOut == MANUAL_FULLFILMENT_TOKEN, "RV: tokenOut != fiat");
        }else{
            _requireTokenExists(tokenOut);
        }

        feeAmount = _getFeeAmount(user, tokenOut, amountMTokenIn, isInstant);
        amountMTokenWithoutFee = amountMTokenIn - feeAmount;
        require(amountMTokenWithoutFee > 0, "RV: tokenOut amount zero");
    }
}
