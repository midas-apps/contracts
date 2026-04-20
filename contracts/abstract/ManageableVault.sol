// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {IManageableVault, TokenConfig, CommonVaultInitParams, CommonVaultV2InitParams, LimitConfig} from "../interfaces/IManageableVault.sol";
import {IMToken} from "../interfaces/IMToken.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

import {Greenlistable} from "../access/Greenlistable.sol";
import {Blacklistable} from "../access/Blacklistable.sol";
import {WithSanctionsList} from "../abstract/WithSanctionsList.sol";

import {DecimalsCorrectionLibrary} from "../libraries/DecimalsCorrectionLibrary.sol";
import {Pausable} from "../access/Pausable.sol";

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
    using EnumerableSet for EnumerableSet.UintSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

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

    /**
     * @notice mToken token
     */
    IMToken public mToken;

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
     * @dev legacy mapping kept for layout compatibility
     * @custom:oz-renamed-from instantDailyLimit
     */
    // solhint-disable-next-line var-name-mixedcase
    uint256 private _instantDailyLimit_deprecated;

    /**
     * @dev legacy mapping kept for layout compatibility
     * @custom:oz-renamed-from dailyLimits
     */
    // solhint-disable-next-line var-name-mixedcase
    mapping(uint256 => uint256) private _dailyLimits_deprecated;

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
     * @notice minimum instant fee
     */
    uint64 public minInstantFee;

    /**
     * @notice maximum instant fee
     */
    uint64 public maxInstantFee;

    /**
     * @notice maximum instant share value in basis points (100 = 1%)
     */
    uint64 public maxInstantShare;

    /**
     * @notice max requestId that can be approved
     */
    uint256 public maxApproveRequestId;

    /**
     * @notice set of limit config windows
     */
    EnumerableSet.UintSet private _limitWindows;

    /**
     * @notice mapping, window duration in seconds => limit config
     */
    mapping(uint256 => LimitConfig) public limitConfigs;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[45] private __gap;

    /**
     * @dev checks that msg.sender do have a vaultRole() role
     * and validates if function is not paused
     */
    modifier validateVaultAdminAccess() {
        _validateVaultAdminAccess(msg.sender, true);
        _;
    }

    /**
     * @dev validate msg.sender and recipient access, validates if function is not paused
     * @param recipient recipient address
     */
    modifier validateUserAccess(address recipient) {
        _validateUserAccess(msg.sender, recipient);
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_init(
        CommonVaultInitParams calldata _commonVaultInitParams
    ) internal onlyInitializing {
        _validateAddress(_commonVaultInitParams.mToken, false);
        _validateAddress(_commonVaultInitParams.mTokenDataFeed, false);
        _validateAddress(_commonVaultInitParams.tokensReceiver, true);
        _validateAddress(_commonVaultInitParams.feeReceiver, true);
        _validateFee(_commonVaultInitParams.variationTolerance, true);
        _validateFee(_commonVaultInitParams.instantFee, false);

        mToken = IMToken(_commonVaultInitParams.mToken);
        __Pausable_init(_commonVaultInitParams.ac);
        __Greenlistable_init_unchained();
        __Blacklistable_init_unchained();
        __WithSanctionsList_init_unchained(
            _commonVaultInitParams.sanctionsList
        );

        tokensReceiver = _commonVaultInitParams.tokensReceiver;
        feeReceiver = _commonVaultInitParams.feeReceiver;
        instantFee = _commonVaultInitParams.instantFee;
        minAmount = _commonVaultInitParams.minAmount;
        variationTolerance = _commonVaultInitParams.variationTolerance;
        mTokenDataFeed = IDataFeed(_commonVaultInitParams.mTokenDataFeed);
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _commonVaultV2InitParams init params for common vault v2
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_initV2(
        CommonVaultV2InitParams calldata _commonVaultV2InitParams
    ) internal onlyInitializing {
        _validateFee(_commonVaultV2InitParams.maxInstantShare, false);

        for (
            uint256 i = 0;
            i < _commonVaultV2InitParams.limitConfigs.length;
            ++i
        ) {
            _setInstantLimitConfig(
                _commonVaultV2InitParams.limitConfigs[i].window,
                _commonVaultV2InitParams.limitConfigs[i].limit
            );
        }

        maxInstantShare = _commonVaultV2InitParams.maxInstantShare;

        _setMinMaxInstantFee(
            _commonVaultV2InitParams.minInstantFee,
            _commonVaultV2InitParams.maxInstantFee
        );
    }

    /**
     * @inheritdoc IManageableVault
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 tokenFee,
        uint256 allowance,
        bool stable
    ) external validateVaultAdminAccess {
        require(_paymentTokens.add(token), "MV: already added");
        _validateAddress(dataFeed, false);
        _validateFee(tokenFee, false);

        tokensConfig[token] = TokenConfig({
            dataFeed: dataFeed,
            fee: tokenFee,
            allowance: allowance,
            stable: stable
        });
        emit AddPaymentToken(
            msg.sender,
            token,
            dataFeed,
            tokenFee,
            allowance,
            stable
        );
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is not presented
     */
    function removePaymentToken(address token)
        external
        validateVaultAdminAccess
    {
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
        validateVaultAdminAccess
    {
        _requireTokenExists(token);

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
        validateVaultAdminAccess
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
    function setVariationTolerance(uint256 tolerance)
        external
        validateVaultAdminAccess
    {
        _validateFee(tolerance, true);

        variationTolerance = tolerance;
        emit SetVariationTolerance(msg.sender, tolerance);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMinAmount(uint256 newAmount) external validateVaultAdminAccess {
        minAmount = newAmount;
        emit SetMinAmount(msg.sender, newAmount);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already added
     */
    function addWaivedFeeAccount(address account)
        external
        validateVaultAdminAccess
    {
        require(!waivedFeeRestriction[account], "MV: already added");
        waivedFeeRestriction[account] = true;
        emit AddWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if account is already removed
     */
    function removeWaivedFeeAccount(address account)
        external
        validateVaultAdminAccess
    {
        require(waivedFeeRestriction[account], "MV: not found");
        waivedFeeRestriction[account] = false;
        emit RemoveWaivedFeeAccount(account, msg.sender);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setFeeReceiver(address receiver)
        external
        validateVaultAdminAccess
    {
        _validateAddress(receiver, true);

        feeReceiver = receiver;

        emit SetFeeReceiver(msg.sender, receiver);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setTokensReceiver(address receiver)
        external
        validateVaultAdminAccess
    {
        _validateAddress(receiver, true);

        tokensReceiver = receiver;

        emit SetTokensReceiver(msg.sender, receiver);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantFee(uint256 newInstantFee)
        external
        validateVaultAdminAccess
    {
        _validateFee(newInstantFee, false);

        instantFee = newInstantFee;
        emit SetInstantFee(msg.sender, newInstantFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMinMaxInstantFee(
        uint64 newMinInstantFee,
        uint64 newMaxInstantFee
    ) external validateVaultAdminAccess {
        _setMinMaxInstantFee(newMinInstantFee, newMaxInstantFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMaxInstantShare(uint64 newMaxInstantShare)
        external
        validateVaultAdminAccess
    {
        _validateFee(newMaxInstantShare, false);
        maxInstantShare = newMaxInstantShare;
        emit SetMaxInstantShare(msg.sender, newMaxInstantShare);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMaxApproveRequestId(uint256 newMaxApproveRequestId)
        external
        validateVaultAdminAccess
    {
        maxApproveRequestId = newMaxApproveRequestId;
        emit SetMaxApproveRequestId(msg.sender, newMaxApproveRequestId);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantLimitConfig(uint256 window, uint256 limit)
        external
        validateVaultAdminAccess
    {
        _setInstantLimitConfig(window, limit);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function removeInstantLimitConfig(uint256 window)
        external
        validateVaultAdminAccess
    {
        require(_limitWindows.remove(window), "MV: window not found");
        delete limitConfigs[window];
        emit RemoveInstantLimitConfig(msg.sender, window);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function freeFromMinAmount(address user, bool enable)
        external
        validateVaultAdminAccess
    {
        require(isFreeFromMinAmount[user] != enable, "DV: already free");

        isFreeFromMinAmount[user] = enable;

        emit FreeFromMinAmount(user, enable);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function withdrawToken(address token, uint256 amount)
        external
        validateVaultAdminAccess
    {
        address withdrawTo = tokensReceiver;
        IERC20(token).safeTransfer(withdrawTo, amount);
        emit WithdrawToken(msg.sender, token, withdrawTo, amount);
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
     * @notice returns array of limit configs
     * @return windows array of limit config windows
     * @return configs array of limit configs
     */
    function getLimitConfigs()
        external
        view
        returns (uint256[] memory windows, LimitConfig[] memory configs)
    {
        uint256 length = _limitWindows.length();
        windows = new uint256[](length);
        configs = new LimitConfig[](length);
        for (uint256 i = 0; i < length; ++i) {
            windows[i] = _limitWindows.at(i);
            configs[i] = limitConfigs[windows[i]];
        }
    }

    /**
     * @notice AC role of vault administrator
     * @return role bytes32 role
     */
    function vaultRole() public view virtual returns (bytes32);

    /**
     * @dev set minimum/maximum instant fee
     * @param newMinInstantFee new minimum instant fee
     * @param newMaxInstantFee new maximum instant fee
     */
    function _setMinMaxInstantFee(
        uint64 newMinInstantFee,
        uint64 newMaxInstantFee
    ) private {
        _validateFee(newMinInstantFee, false);
        _validateFee(newMaxInstantFee, false);
        require(
            newMinInstantFee <= newMaxInstantFee,
            "MV: invalid min/max fee"
        );
        minInstantFee = newMinInstantFee;
        maxInstantFee = newMaxInstantFee;
        emit SetMinMaxInstantFee(
            msg.sender,
            newMinInstantFee,
            newMaxInstantFee
        );
    }

    /**
     * @dev set instant limit config
     * @param window window duration in seconds
     * @param limit limit amount per window
     */
    function _setInstantLimitConfig(uint256 window, uint256 limit) private {
        // add window to set if not exists
        _limitWindows.add(window);

        LimitConfig memory existingConfig = limitConfigs[window];
        limitConfigs[window] = LimitConfig({
            limit: limit,
            limitUsed: existingConfig.limitUsed,
            lastEpoch: existingConfig.lastEpoch
        });

        emit SetInstantLimitConfig(msg.sender, window, limit);
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
    ) internal returns (uint256 transferAmount) {
        return
            _tokenTransferFromTo(token, msg.sender, to, amount, tokenDecimals);
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
        _tokenTransferFromTo(token, address(this), to, amount, tokenDecimals);
    }

    /**
     * @dev do safeTransfer or safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision.
     * @param token address of token
     * @param from address. If its address(this) the safeTransfer will be used
     * instead of safeTransferFrom
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
    ) internal returns (uint256 transferAmount) {
        if (amount == 0) return 0;
        transferAmount = amount.convertFromBase18(tokenDecimals);

        require(
            amount == transferAmount.convertToBase18(tokenDecimals),
            "MV: invalid rounding"
        );

        if (from == address(this)) {
            IERC20(token).safeTransfer(to, transferAmount);
        } else {
            IERC20(token).safeTransferFrom(from, to, transferAmount);
        }
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
        for (uint256 i = 0; i < _limitWindows.length(); ++i) {
            uint256 window = _limitWindows.at(i);
            LimitConfig memory config = limitConfigs[window];
            uint256 currentEpochIndex = block.timestamp / window;

            if (currentEpochIndex != config.lastEpoch) {
                config.limitUsed = 0;
                config.lastEpoch = currentEpochIndex;
            }

            config.limitUsed += amount;

            require(config.limitUsed <= config.limit, "MV: exceed limit");

            limitConfigs[window] = config;
        }
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
        if (prevAllowance == type(uint256).max) return;

        require(prevAllowance >= amount, "MV: exceed allowance");

        tokensConfig[token].allowance -= amount;
    }

    /**
     * @dev returns calculated fee amount depends on the provided fee percent and amount
     * @param feePercent fee percent
     * @param amount amount of token (decimals 18)

     * @return feeAmount calculated fee amount
     */
    function _getFeeAmount(uint256 feePercent, uint256 amount)
        internal
        view
        returns (uint256)
    {
        return (amount * feePercent) / ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev returns calculated fee percent depends on parameters
     * @param sender sender address
     * @param token token address
     * @param isInstant is instant operation
     *
     * @return feePercent calculated fee percent
     */
    function _getFee(
        address sender,
        address token,
        bool isInstant
    ) internal view returns (uint256 feePercent) {
        if (waivedFeeRestriction[sender]) return 0;

        TokenConfig storage tokenConfig = tokensConfig[token];
        feePercent = tokenConfig.fee;

        if (isInstant) feePercent += instantFee;

        if (feePercent > ONE_HUNDRED_PERCENT) feePercent = ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev validates instant fee is within the range of min/max instant fee
     */
    function _validateInstantFee() internal view {
        uint256 currentInstantFee = instantFee;
        require(
            currentInstantFee >= minInstantFee &&
                currentInstantFee <= maxInstantFee,
            "MV: invalid instant fee"
        );
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

    /**
     * @dev validate user access
     * @param user user address
     * @param validatePaused if true, validates if function is not paused
     */
    function _validateUserAccess(address user, bool validatePaused)
        internal
        view
        onlyGreenlisted(user)
        onlyNotBlacklisted(user)
        onlyNotSanctioned(user)
    {
        if (!validatePaused) return;
        _requireFnNotPaused(msg.sig, true);
    }

    /**
     * @dev validate user access and validates if function is not paused
     * @param user user address
     * @param recipient recipient address
     */
    function _validateUserAccess(address user, address recipient)
        internal
        view
    {
        _validateUserAccess(user, true);

        if (recipient != user) {
            _validateUserAccess(recipient, false);
        }
    }

    /**
     * @dev validate vault admin access for `account`
     * and validates if function is not paused
     * @param account address to check
     * @param checkPaused if true, validates if function is not paused
     */
    function _validateVaultAdminAccess(address account, bool checkPaused)
        private
        view
    {
        if (checkPaused) {
            _requireFnNotPaused(msg.sig, false);
        }
        if (accessControl.hasRole(vaultRole(), account)) return;
        _hasFunctionPermission(vaultRole(), msg.sig, account);
    }

    /**
     * @inheritdoc Pausable
     */
    function _validatePauseAdminAccess(address account) internal view override {
        _validateVaultAdminAccess(account, false);
    }

    /**
     * @inheritdoc Greenlistable
     */
    function _validateGreenlistableAdminAccess(address account)
        internal
        view
        override
    {
        _validateVaultAdminAccess(account, true);
    }

    /**
     * @inheritdoc WithSanctionsList
     */
    function _validateSanctionListAdminAccess(address account)
        internal
        view
        override
    {
        _validateVaultAdminAccess(account, true);
    }

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

    /**
     * @dev gets and validates mToken rate
     * @return mTokenRate mToken rate
     */
    function _getMTokenRate() internal view returns (uint256 mTokenRate) {
        mTokenRate = _getTokenRate(address(mTokenDataFeed), false);
        _validateTokenRate(mTokenRate);
    }

    /**
     * @dev gets and validates pToken rate
     * @param token address of pToken
     * @return tokenRate token rate
     */
    function _getPTokenRate(address token)
        internal
        view
        returns (uint256 tokenRate)
    {
        TokenConfig storage tokenConfig = tokensConfig[token];
        tokenRate = _getTokenRate(tokenConfig.dataFeed, tokenConfig.stable);
        _validateTokenRate(tokenRate);
    }

    /**
     * @dev validates token rate
     * @param rate token rate
     */
    function _validateTokenRate(uint256 rate) private pure {
        require(rate > 0, "MV: rate zero");
    }
}
