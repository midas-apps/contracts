// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/IManageableVault.sol";
import "../interfaces/IMTbill.sol";
import "../interfaces/IDataFeed.sol";

import "../access/Greenlistable.sol";
import "../access/Blacklistable.sol";
import "../abstract/WithSanctionsList.sol";

import "../libraries/DecimalsCorrectionLibrary.sol";
import "../access/Pausable.sol";

/**
 * @title ManageableVault
 * @author RedDuck Software
 * @notice Contract with base Vault methods
 */
abstract contract ManageableVault is
    Pausable,
    IManageableVault,
    Blacklistable,
    Greenlistable,
    WithSanctionsList
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    /**
     * @notice address that represents off-chain USD bank transfer
     */
    address public constant MANUAL_FULLFILMENT_TOKEN = address(0x0);

    /**
     * @notice stable coin static rate 1:1 USD in 18 decimals
     */
    uint256 public constant STABLECOIN_RATE = 10**18;

    /**
     * @notice last request id
     */
    Counters.Counter public currentRequestId;

    /**
     * @notice 100 percent with base 100
     * @dev for example, 10% will be (10 * 100)%
     */
    uint256 public constant ONE_HUNDRED_PERCENT = 100 * 100;

    uint256 public constant MAX_UINT = type(uint256).max;

    /**
     * @notice mToken token
     */
    IMTbill public mToken;

    /**
     * @notice mToken data feed contract
     */
    IDataFeed public mTokenDataFeed;

    /**
     * @notice address to which tokens and mTokens will be sent
     */
    address public tokensReceiver;

    /**
     * @dev fee for initial operations 1% = 100
     */
    uint256 public instantFee;

    /**
     * @dev daily limit for initial operations
     * if user exceed this limit he will need
     * to create requests
     */
    uint256 public instantDailyLimit;

    /**
     * @dev mapping days (number from 1970) to limit amount
     */
    mapping(uint256 => uint256) public dailyLimits;

    /**
     * @notice address to which fees will be sent
     */
    address public feeReceiver;

    /**
     * @notice variation tolerance of tokenOut rates for "safe" requests approve
     */
    uint256 public variationTolerance;

    /**
     * @notice address restriction with zero fees
     */
    mapping(address => bool) public waivedFeeRestriction;

    /**
     * @dev tokens that can be used as USD representation
     */
    EnumerableSet.AddressSet internal _paymentTokens;

    /**
     * @notice mapping, token address to token config
     */
    mapping(address => TokenConfig) public tokensConfig;

    /**
     * @notice basic min operations amount
     */
    uint256 public minAmount;

    /**
     * @notice mapping, user address => is free frmo min amounts
     */
    mapping(address => bool) public isFreeFromMinAmount;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev checks that msg.sender do have a vaultRole() role
     */
    modifier onlyVaultAdmin() {
        _onlyRole(vaultRole(), msg.sender);
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_init(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount
    ) internal onlyInitializing {
        _validateAddress(_mTokenInitParams.mToken, false);
        _validateAddress(_mTokenInitParams.mTokenDataFeed, false);
        _validateAddress(_receiversInitParams.tokensReceiver, true);
        _validateAddress(_receiversInitParams.feeReceiver, true);
        require(_instantInitParams.instantDailyLimit > 0, "zero limit");
        _validateFee(_variationTolerance, true);
        _validateFee(_instantInitParams.instantFee, false);

        mToken = IMTbill(_mTokenInitParams.mToken);
        __Pausable_init(_ac);
        __Greenlistable_init_unchained();
        __Blacklistable_init_unchained();
        __WithSanctionsList_init_unchained(_sanctionsList);

        tokensReceiver = _receiversInitParams.tokensReceiver;
        feeReceiver = _receiversInitParams.feeReceiver;
        instantFee = _instantInitParams.instantFee;
        instantDailyLimit = _instantInitParams.instantDailyLimit;
        minAmount = _minAmount;
        variationTolerance = _variationTolerance;
        mTokenDataFeed = IDataFeed(_mTokenInitParams.mTokenDataFeed);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function withdrawToken(
        address token,
        uint256 amount,
        address withdrawTo
    ) external onlyVaultAdmin {
        IERC20(token).safeTransfer(withdrawTo, amount);

        emit WithdrawToken(msg.sender, token, withdrawTo, amount);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is already added
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 tokenFee,
        bool stable
    ) external onlyVaultAdmin {
        require(_paymentTokens.add(token), "MV: already added");
        _validateAddress(dataFeed, false);
        _validateFee(tokenFee, false);

        tokensConfig[token] = TokenConfig({
            dataFeed: dataFeed,
            fee: tokenFee,
            allowance: MAX_UINT,
            stable: stable
        });
        emit AddPaymentToken(msg.sender, token, dataFeed, tokenFee, stable);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is not presented
     */
    function removePaymentToken(address token) external onlyVaultAdmin {
        require(_paymentTokens.remove(token), "MV: not exists");
        delete tokensConfig[token];
        emit RemovePaymentToken(token, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if new allowance zero
     */
    function changeTokenAllowance(address token, uint256 allowance)
        external
        onlyVaultAdmin
    {
        if (token != MANUAL_FULLFILMENT_TOKEN) {
            _requireTokenExists(token);
        }

        require(allowance > 0, "MV: zero allowance");
        tokensConfig[token].allowance = allowance;
        emit ChangeTokenAllowance(token, msg.sender, allowance);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if new fee > 100%
     */
    function changeTokenFee(address token, uint256 fee)
        external
        onlyVaultAdmin
    {
        _requireTokenExists(token);
        _validateFee(fee, false);

        tokensConfig[token].fee = fee;
        emit ChangeTokenFee(token, msg.sender, fee);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if new tolerance zero
     */
    function setVariationTolerance(uint256 tolerance) external onlyVaultAdmin {
        _validateFee(tolerance, true);

        variationTolerance = tolerance;
        emit SetVariationTolerance(msg.sender, tolerance);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMinAmount(uint256 newAmount) external onlyVaultAdmin {
        minAmount = newAmount;
        emit SetMinAmount(msg.sender, newAmount);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already added
     */
    function addWaivedFeeAccount(address account) external onlyVaultAdmin {
        require(!waivedFeeRestriction[account], "MV: already added");
        waivedFeeRestriction[account] = true;
        emit AddWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already removed
     */
    function removeWaivedFeeAccount(address account) external onlyVaultAdmin {
        require(waivedFeeRestriction[account], "MV: not found");
        waivedFeeRestriction[account] = false;
        emit RemoveWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setFeeReceiver(address receiver) external onlyVaultAdmin {
        _validateAddress(receiver, true);

        feeReceiver = receiver;

        emit SetFeeReceiver(msg.sender, receiver);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setTokensReceiver(address receiver) external onlyVaultAdmin {
        _validateAddress(receiver, true);

        tokensReceiver = receiver;

        emit SetTokensReceiver(msg.sender, receiver);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantFee(uint256 newInstantFee) external onlyVaultAdmin {
        _validateFee(newInstantFee, false);

        instantFee = newInstantFee;
        emit SetInstantFee(msg.sender, newInstantFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantDailyLimit(uint256 newInstantDailyLimit)
        external
        onlyVaultAdmin
    {
        require(newInstantDailyLimit > 0, "MV: limit zero");
        instantDailyLimit = newInstantDailyLimit;
        emit SetInstantDailyLimit(msg.sender, newInstantDailyLimit);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function freeFromMinAmount(address user, bool enable)
        external
        onlyVaultAdmin
    {
        require(isFreeFromMinAmount[user] != enable, "DV: already free");

        isFreeFromMinAmount[user] = enable;

        emit FreeFromMinAmount(user, enable);
    }

    /**
     * @notice returns array of stablecoins supported by the vault
     * can be called only from permissioned actor.
     * @return paymentTokens array of payment tokens
     */
    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }

    /**
     * @notice AC role of vault administrator
     * @return role bytes32 role
     */
    function vaultRole() public view virtual returns (bytes32);

    /**
     * @inheritdoc WithSanctionsList
     */
    function sanctionsListAdminRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return vaultRole();
    }

    /**
     * @inheritdoc Pausable
     */
    function pauseAdminRole() public view override returns (bytes32) {
        return vaultRole();
    }

    /**
     * @dev do safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision. Sends tokens
     * from `msg.sender` to `tokensReceiver`
     * @param token address of token
     * @param to address of user
     * @param amount amount of `token` to transfer from `user` (decimals 18)
     * @param tokenDecimals token decimals
     */
    function _tokenTransferFromUser(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) internal {
        uint256 transferAmount = amount.convertFromBase18(tokenDecimals);

        require(
            amount == transferAmount.convertToBase18(tokenDecimals),
            "MV: invalid rounding"
        );

        IERC20(token).safeTransferFrom(msg.sender, to, transferAmount);
    }

    /**
     * @dev do safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision.
     * @param token address of token
     * @param from address
     * @param to address
     * @param amount amount of `token` to transfer from `user`
     * @param tokenDecimals token decimals
     */
    function _tokenTransferFromTo(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) internal {
        uint256 transferAmount = amount.convertFromBase18(tokenDecimals);

        require(
            amount == transferAmount.convertToBase18(tokenDecimals),
            "MV: invalid rounding"
        );

        IERC20(token).safeTransferFrom(from, to, transferAmount);
    }

    /**
     * @dev do safeTransfer on a given token
     * and converts `amount` from base18
     * to amount with a correct precision. Sends tokens
     * from `contract` to `user`
     * @param token address of token
     * @param to address of user
     * @param amount amount of `token` to transfer from `user` (decimals 18)
     * @param tokenDecimals token decimals
     */
    function _tokenTransferToUser(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) internal {
        uint256 transferAmount = amount.convertFromBase18(tokenDecimals);

        require(
            amount == transferAmount.convertToBase18(tokenDecimals),
            "MV: invalid rounding"
        );

        IERC20(token).safeTransfer(to, transferAmount);
    }

    /**
     * @dev retreives decimals of a given `token`
     * @param token address of token
     * @return decimals decinmals value of a given `token`
     */
    function _tokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @dev checks that `token` is presented in `_paymentTokens`
     * @param token address of token
     */
    function _requireTokenExists(address token) internal view virtual {
        require(_paymentTokens.contains(token), "MV: token not exists");
    }

    /**
     * @dev check if operation exceed daily limit and update limit data
     * @param amount operation amount (decimals 18)
     */
    function _requireAndUpdateLimit(uint256 amount) internal {
        uint256 currentDayNumber = block.timestamp / 1 days;
        uint256 nextLimitAmount = dailyLimits[currentDayNumber] + amount;

        require(nextLimitAmount <= instantDailyLimit, "MV: exceed limit");

        dailyLimits[currentDayNumber] = nextLimitAmount;
    }

    /**
     * @dev check if operation exceed token allowance and update allowance
     * @param token address of token
     * @param amount operation amount (decimals 18)
     */
    function _requireAndUpdateAllowance(address token, uint256 amount)
        internal
    {
        uint256 prevAllowance = tokensConfig[token].allowance;
        if (prevAllowance == MAX_UINT) return;

        require(prevAllowance >= amount, "MV: exceed allowance");

        tokensConfig[token].allowance -= amount;
    }

    /**
     * @dev returns calculated fee amount depends on parameters
     * if additionalFee not zero, token fee replaced with additionalFee
     * @param sender sender address
     * @param token token address
     * @param amount amount of token (decimals 18)
     * @param isInstant is instant operation
     * @param additionalFee fee for fiat operations
     * @return fee amount of input token
     */
    function _getFeeAmount(
        address sender,
        address token,
        uint256 amount,
        bool isInstant,
        uint256 additionalFee
    ) internal view returns (uint256) {
        if (waivedFeeRestriction[sender]) return 0;

        uint256 feePercent;
        if (additionalFee == 0) {
            TokenConfig storage tokenConfig = tokensConfig[token];
            feePercent = tokenConfig.fee;
        } else {
            feePercent = additionalFee;
        }

        if (isInstant) feePercent += instantFee;

        if (feePercent > ONE_HUNDRED_PERCENT) feePercent = ONE_HUNDRED_PERCENT;

        return (amount * feePercent) / ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev check if prev and new prices diviation fit variationTolerance
     * @param prevPrice previous rate
     * @param newPrice new rate
     */
    function _requireVariationTolerance(uint256 prevPrice, uint256 newPrice)
        internal
        view
    {
        uint256 priceDif = newPrice >= prevPrice
            ? newPrice - prevPrice
            : prevPrice - newPrice;

        uint256 priceDifPercent = (priceDif * ONE_HUNDRED_PERCENT) / prevPrice;

        require(
            priceDifPercent <= variationTolerance,
            "MV: exceed price diviation"
        );
    }

    function _validateUserAccess(address user)
        internal
        view
        onlyGreenlisted(user)
        onlyNotBlacklisted(user)
        onlyNotSanctioned(user)
    {}

    /**
     * @dev convert value to inputted decimals precision
     * @param value value for format
     * @param decimals decimals
     * @return converted amount
     */
    function _truncate(uint256 value, uint256 decimals)
        internal
        pure
        returns (uint256)
    {
        return value.convertFromBase18(decimals).convertToBase18(decimals);
    }

    /**
     * @dev check if fee <= 100% and check > 0 if needs
     * @param fee fee value
     * @param checkMin if need to check minimum
     */
    function _validateFee(uint256 fee, bool checkMin) internal pure {
        require(fee <= ONE_HUNDRED_PERCENT, "fee > 100%");
        if (checkMin) require(fee > 0, "fee == 0");
    }

    /**
     * @dev check if address not zero and not address(this)
     * @param addr address to check
     * @param selfCheck check if address not address(this)
     */
    function _validateAddress(address addr, bool selfCheck) internal view {
        require(addr != address(0), "zero address");
        if (selfCheck) require(addr != address(this), "invalid address");
    }

    /**
     * @dev get token rate depends on data feed and stablecoin flag
     * @param dataFeed address of dataFeed from token config
     * @param stable is stablecoin
     */
    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        virtual
        returns (uint256)
    {
        // @dev if dataFeed returns rate, all peg checks passed
        uint256 rate = IDataFeed(dataFeed).getDataInBase18();

        if (stable) return STABLECOIN_RATE;

        return rate;
    }
}
