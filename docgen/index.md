# Solidity API

## RedemptionVault

Smart contract that handles mTBILL redemptions

### CalcAndValidateRedeemResult

```solidity
struct CalcAndValidateRedeemResult {
  uint256 feeAmount;
  uint256 amountMTokenWithoutFee;
}
```

### minFiatRedeemAmount

```solidity
uint256 minFiatRedeemAmount
```

min amount for fiat requests

### fiatAdditionalFee

```solidity
uint256 fiatAdditionalFee
```

fee percent for fiat requests

### fiatFlatFee

```solidity
uint256 fiatFlatFee
```

static fee in mToken for fiat requests

### redeemRequests

```solidity
mapping(uint256 => struct Request) redeemRequests
```

mapping, requestId to request data

### requestRedeemer

```solidity
address requestRedeemer
```

address is designated for standard redemptions, allowing tokens to be pulled from this address

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations |
| _fiatRedemptionInitParams | struct FiatRedeptionInitParams | params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount |
| _requestRedeemer | address | address is designated for standard redemptions, allowing tokens to be pulled from this address |

### __RedemptionVault_init

```solidity
function __RedemptionVault_init(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer) internal
```

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mTBILL from the user.
Transfers fee in mToken to feeReceiver
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mTBILL to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external
```

Does the same as `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mTBILL to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request if tokenOut not fiat
Transfers amount in mToken to contract
Transfers fee in mToken to feeReceiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipient) external returns (uint256)
```

Does the same as `redeemRequest` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| recipient | address | address that receives tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### redeemFiatRequest

```solidity
function redeemFiatRequest(uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request if tokenOut is fiat
Transfers amount in mToken to contract
Transfers fee in mToken to feeReceiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newMTokenRate) external
```

approving redeem request if not exceed tokenOut allowance
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate inputted by vault admin |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newMTokenRate) external
```

approving request if inputted token rate fit price diviation percent
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate inputted by vault admin |

### rejectRequest

```solidity
function rejectRequest(uint256 requestId) external
```

rejecting request
Sets request flag to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setMinFiatRedeemAmount

```solidity
function setMinFiatRedeemAmount(uint256 newValue) external
```

set new min amount for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min amount |

### setFiatFlatFee

```solidity
function setFiatFlatFee(uint256 feeInMToken) external
```

set fee amount in mToken for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeInMToken | uint256 | fee amount in mToken |

### setFiatAdditionalFee

```solidity
function setFiatAdditionalFee(uint256 newFee) external
```

set new fee percent for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFee | uint256 | new fee percent 1% = 100 |

### setRequestRedeemer

```solidity
function setRequestRedeemer(address redeemer) external
```

set address which is designated for standard redemptions, allowing tokens to be pulled from this address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| redeemer | address | new address of request redeemer |

### vaultRole

```solidity
function vaultRole() public pure virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _approveRequest

```solidity
function _approveRequest(uint256 requestId, uint256 newMTokenRate, bool isSafe) internal
```

validates approve
burns amount from contract
transfer tokenOut to user if not fiat
sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate |
| isSafe | bool | new mToken rate |

### _validateRequest

```solidity
function _validateRequest(address sender, enum RequestStatus status) internal pure
```

validates request
if exist
if not processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | sender address |
| status | enum RequestStatus | request status |

### _redeemInstant

```solidity
function _redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) internal virtual returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult, uint256 amountTokenOutWithoutFee)
```

_internal redeem instant logic_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | amount of mToken (decimals 18) |
| minReceiveAmount | uint256 | min amount of tokenOut to receive (decimals 18) |
| recipient | address | recipient address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| calcResult | struct RedemptionVault.CalcAndValidateRedeemResult | calculated redeem result |
| amountTokenOutWithoutFee | uint256 | amount of tokenOut without fee |

### _redeemRequest

```solidity
function _redeemRequest(address tokenOut, uint256 amountMTokenIn, bool isFiat, address recipient) internal returns (uint256 requestId, struct RedemptionVault.CalcAndValidateRedeemResult calcResult)
```

internal redeem request logic

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | amount of mToken (decimals 18) |
| isFiat | bool |  |
| recipient | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| calcResult | struct RedemptionVault.CalcAndValidateRedeemResult | calc result |

### _convertUsdToToken

```solidity
function _convertUsdToToken(uint256 amountUsd, address tokenOut) internal view returns (uint256 amountToken, uint256 tokenRate)
```

_calculates tokenOut amount from USD amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsd | uint256 | amount of USD (decimals 18) |
| tokenOut | address | tokenOut address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountToken | uint256 | converted USD to tokenOut |
| tokenRate | uint256 | conversion rate |

### _convertMTokenToUsd

```solidity
function _convertMTokenToUsd(uint256 amountMToken) internal view returns (uint256 amountUsd, uint256 mTokenRate)
```

_calculates USD amount from mToken amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMToken | uint256 | amount of mToken (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsd | uint256 | converted amount to USD |
| mTokenRate | uint256 | conversion rate |

### _calcAndValidateRedeem

```solidity
function _calcAndValidateRedeem(address user, address tokenOut, uint256 amountMTokenIn, bool isInstant, bool isFiat) internal view returns (struct RedemptionVault.CalcAndValidateRedeemResult result)
```

_validate redeem and calculate fee_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | mToken amount (decimals 18) |
| isInstant | bool | is instant operation |
| isFiat | bool | is fiat operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct RedemptionVault.CalcAndValidateRedeemResult | calc result |

## RedemptionVaultWIthBUIDL

Smart contract that handles mTBILL redemptions

### minBuidlToRedeem

```solidity
uint256 minBuidlToRedeem
```

minimum amount of BUIDL to redeem. Will redeem at least this amount of BUIDL.

### minBuidlBalance

```solidity
uint256 minBuidlBalance
```

### buidlRedemption

```solidity
contract IRedemption buidlRedemption
```

### SetMinBuidlToRedeem

```solidity
event SetMinBuidlToRedeem(uint256 minBuidlToRedeem, address sender)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minBuidlToRedeem | uint256 | new min amount of BUIDL to redeem |
| sender | address | address who set new min amount of BUIDL to redeem |

### SetMinBuidlBalance

```solidity
event SetMinBuidlBalance(uint256 minBuidlBalance, address sender)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minBuidlBalance | uint256 | new `minBuidlBalance` value |
| sender | address | address who set new `minBuidlBalance` |

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer, address _buidlRedemption, uint256 _minBuidlToRedeem, uint256 _minBuidlBalance) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations |
| _fiatRedemptionInitParams | struct FiatRedeptionInitParams | params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount |
| _requestRedeemer | address | address is designated for standard redemptions, allowing tokens to be pulled from this address |
| _buidlRedemption | address | BUIDL redemption contract address |
| _minBuidlToRedeem | uint256 |  |
| _minBuidlBalance | uint256 |  |

### setMinBuidlToRedeem

```solidity
function setMinBuidlToRedeem(uint256 _minBuidlToRedeem) external
```

set min amount of BUIDL to redeem.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minBuidlToRedeem | uint256 | min amount of BUIDL to redeem |

### setMinBuidlBalance

```solidity
function setMinBuidlBalance(uint256 _minBuidlBalance) external
```

set new `minBuidlBalance` value.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minBuidlBalance | uint256 | new `minBuidlBalance` value |

### _redeemInstant

```solidity
function _redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) internal returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult, uint256 amountTokenOutWithoutFee)
```

_redeem mToken to USDC if daily limit and allowance not exceeded
If contract don't have enough USDC, BUIDL redemption flow will be triggered
Burns mToken from the user.
Transfers fee in mToken to feeReceiver
Transfers tokenOut to user._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | token out address, always ignore |
| amountMTokenIn | uint256 | amount of mToken to redeem |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address |  |

### _checkAndRedeemBUIDL

```solidity
function _checkAndRedeemBUIDL(address tokenOut, uint256 amountTokenOut) internal
```

Check if contract have enough USDC balance for redeem
if don't have trigger BUIDL redemption flow

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountTokenOut | uint256 | amount of tokenOut |

## RedemptionVaultWithSwapper

Smart contract that handles mToken redemption.
In case of insufficient liquidity it uses a RV from a different
Midas product to fulfill instant redemption.

_mToken1 - is a main mToken of this vault
mToken2 - is a token of a second vault that is triggered when
current vault don`t have enough liquidity_

### mTbillRedemptionVault

```solidity
contract IRedemptionVault mTbillRedemptionVault
```

mToken1 redemption vault

_The naming was not altered to maintain
compatibility with the currently deployed contracts._

### liquidityProvider

```solidity
address liquidityProvider
```

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer, address _mTbillRedemptionVault, address _liquidityProvider) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken1 |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations |
| _fiatRedemptionInitParams | struct FiatRedeptionInitParams | params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount |
| _requestRedeemer | address | address is designated for standard redemptions, allowing tokens to be pulled from this address |
| _mTbillRedemptionVault | address | mToken2 redemptionVault address |
| _liquidityProvider | address | liquidity provider for pull mToken2 |

### _redeemInstant

```solidity
function _redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) internal returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult, uint256 amountTokenOutWithoutFee)
```

_redeem mToken1 to tokenOut if daily limit and allowance not exceeded
If contract don't have enough tokenOut, mToken1 will swap to mToken2 and redeem on mToken2 vault
Burns mToken1 from the user, if swap need mToken1 just tranfers to contract.
Transfers fee in mToken1 to feeReceiver
Transfers tokenOut to user._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | token out address |
| amountMTokenIn | uint256 | amount of mToken1 to redeem |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address |  |

### setLiquidityProvider

```solidity
function setLiquidityProvider(address provider) external
```

sets new liquidity provider address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| provider | address | new liquidity provider address |

### setSwapperVault

```solidity
function setSwapperVault(address newVault) external
```

sets new underlying vault for swapper

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newVault | address |  |

### _swapMToken1ToMToken2

```solidity
function _swapMToken1ToMToken2(uint256 mToken1Amount) internal returns (uint256 mTokenAmount)
```

Transfers mToken1 to liquidity provider
Transfers mToken2 from liquidity provider to contract
Returns amount on mToken2 using exchange rates

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mToken1Amount | uint256 | mToken1 token amount (decimals 18) |

## RedemptionVaultWithUSTB

Smart contract that handles redemptions using USTB

### ustbRedemption

```solidity
contract IUSTBRedemption ustbRedemption
```

USTB redemption contract address

_Used to handle USTB redemptions when vault has insufficient USDC_

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer, address _ustbRedemption) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations |
| _fiatRedemptionInitParams | struct FiatRedeptionInitParams | params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount |
| _requestRedeemer | address | address is designated for standard redemptions, allowing tokens to be pulled from this address |
| _ustbRedemption | address | USTB redemption contract address |

### _redeemInstant

```solidity
function _redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) internal returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult, uint256 amountTokenOutWithoutFee)
```

_Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
If USDC is the payment token and the contract doesn't have enough USDC, the USTB redemption flow will be triggered for the missing amount.
Burns mToken from the user.
Transfers fee in mToken to feeReceiver.
Transfers tokenOut to user._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | token out address |
| amountMTokenIn | uint256 | amount of mToken to redeem |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address |  |

### _checkAndRedeemUSTB

```solidity
function _checkAndRedeemUSTB(address tokenOut, uint256 amountTokenOut) internal
```

Check if contract has enough USDC balance for redeem
if not, trigger USTB redemption flow to redeem exactly the missing amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountTokenOut | uint256 | amount of tokenOut needed |

## ManageableVault

Contract with base Vault methods

### MANUAL_FULLFILMENT_TOKEN

```solidity
address MANUAL_FULLFILMENT_TOKEN
```

address that represents off-chain USD bank transfer

### STABLECOIN_RATE

```solidity
uint256 STABLECOIN_RATE
```

stable coin static rate 1:1 USD in 18 decimals

### currentRequestId

```solidity
struct Counters.Counter currentRequestId
```

last request id

### ONE_HUNDRED_PERCENT

```solidity
uint256 ONE_HUNDRED_PERCENT
```

100 percent with base 100

_for example, 10% will be (10 * 100)%_

### MAX_UINT

```solidity
uint256 MAX_UINT
```

### mToken

```solidity
contract IMTbill mToken
```

mToken token

### mTokenDataFeed

```solidity
contract IDataFeed mTokenDataFeed
```

mToken data feed contract

### tokensReceiver

```solidity
address tokensReceiver
```

address to which tokens and mTokens will be sent

### instantFee

```solidity
uint256 instantFee
```

_fee for initial operations 1% = 100_

### instantDailyLimit

```solidity
uint256 instantDailyLimit
```

_daily limit for initial operations
if user exceed this limit he will need
to create requests_

### dailyLimits

```solidity
mapping(uint256 => uint256) dailyLimits
```

_mapping days (number from 1970) to limit amount_

### feeReceiver

```solidity
address feeReceiver
```

address to which fees will be sent

### variationTolerance

```solidity
uint256 variationTolerance
```

variation tolerance of tokenOut rates for "safe" requests approve

### waivedFeeRestriction

```solidity
mapping(address => bool) waivedFeeRestriction
```

address restriction with zero fees

### _paymentTokens

```solidity
struct EnumerableSetUpgradeable.AddressSet _paymentTokens
```

_tokens that can be used as USD representation_

### tokensConfig

```solidity
mapping(address => struct TokenConfig) tokensConfig
```

mapping, token address to token config

### minAmount

```solidity
uint256 minAmount
```

basic min operations amount

### isFreeFromMinAmount

```solidity
mapping(address => bool) isFreeFromMinAmount
```

mapping, user address => is free frmo min amounts

### onlyVaultAdmin

```solidity
modifier onlyVaultAdmin()
```

_checks that msg.sender do have a vaultRole() role_

### __ManageableVault_init

```solidity
function __ManageableVault_init(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations |

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount, address withdrawTo) external
```

withdraws `amount` of a given `token` from the contract.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |
| withdrawTo | address | withdraw destination address |

### addPaymentToken

```solidity
function addPaymentToken(address token, address dataFeed, uint256 tokenFee, bool stable) external
```

adds a token to the stablecoins list.
can be called only from permissioned actor.

_reverts if token is already added_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| dataFeed | address | dataFeed address |
| tokenFee | uint256 |  |
| stable | bool | is stablecoin flag |

### removePaymentToken

```solidity
function removePaymentToken(address token) external
```

removes a token from stablecoins list.
can be called only from permissioned actor.

_reverts if token is not presented_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### changeTokenAllowance

```solidity
function changeTokenAllowance(address token, uint256 allowance) external
```

set new token allowance.
if MAX_UINT = infinite allowance
prev allowance rewrites by new
can be called only from permissioned actor.

_reverts if new allowance zero_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| allowance | uint256 | new allowance (decimals 18) |

### changeTokenFee

```solidity
function changeTokenFee(address token, uint256 fee) external
```

set new token fee.
can be called only from permissioned actor.

_reverts if new fee > 100%_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| fee | uint256 | new fee percent 1% = 100 |

### setVariationTolerance

```solidity
function setVariationTolerance(uint256 tolerance) external
```

set new prices diviation percent.
can be called only from permissioned actor.

_reverts if new tolerance zero_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tolerance | uint256 | new prices diviation percent 1% = 100 |

### setMinAmount

```solidity
function setMinAmount(uint256 newAmount) external
```

set new min amount.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAmount | uint256 | min amount for operations in mToken |

### addWaivedFeeAccount

```solidity
function addWaivedFeeAccount(address account) external
```

adds a account to waived fee restriction.
can be called only from permissioned actor.

_reverts if account is already added_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |

### removeWaivedFeeAccount

```solidity
function removeWaivedFeeAccount(address account) external
```

removes a account from waived fee restriction.
can be called only from permissioned actor.

_reverts if account is already removed_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |

### setFeeReceiver

```solidity
function setFeeReceiver(address receiver) external
```

set new reciever for fees.
can be called only from permissioned actor.

_reverts address zero or equal address(this)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address |  |

### setTokensReceiver

```solidity
function setTokensReceiver(address receiver) external
```

set new reciever for tokens.
can be called only from permissioned actor.

_reverts address zero or equal address(this)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address |  |

### setInstantFee

```solidity
function setInstantFee(uint256 newInstantFee) external
```

set operation fee percent.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newInstantFee | uint256 | new instant operations fee percent 1& = 100 |

### setInstantDailyLimit

```solidity
function setInstantDailyLimit(uint256 newInstantDailyLimit) external
```

set operation daily limit.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newInstantDailyLimit | uint256 | new operation daily limit (decimals 18) |

### freeFromMinAmount

```solidity
function freeFromMinAmount(address user, bool enable) external
```

frees given `user` from the minimal deposit
amount validation in `initiateDepositRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| enable | bool |  |

### getPaymentTokens

```solidity
function getPaymentTokens() external view returns (address[])
```

returns array of stablecoins supported by the vault
can be called only from permissioned actor.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | paymentTokens array of payment tokens |

### vaultRole

```solidity
function vaultRole() public view virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### sanctionsListAdminRole

```solidity
function sanctionsListAdminRole() public view virtual returns (bytes32)
```

AC role of sanctions list admin

_address that have this role can use `setSanctionsList`_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

_virtual function to determine pauseAdmin role_

### _tokenTransferFromUser

```solidity
function _tokenTransferFromUser(address token, address to, uint256 amount, uint256 tokenDecimals) internal
```

_do safeTransferFrom on a given token
and converts `amount` from base18
to amount with a correct precision. Sends tokens
from `msg.sender` to `tokensReceiver`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |
| to | address | address of user |
| amount | uint256 | amount of `token` to transfer from `user` (decimals 18) |
| tokenDecimals | uint256 | token decimals |

### _tokenTransferFromTo

```solidity
function _tokenTransferFromTo(address token, address from, address to, uint256 amount, uint256 tokenDecimals) internal
```

_do safeTransferFrom on a given token
and converts `amount` from base18
to amount with a correct precision._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |
| from | address | address |
| to | address | address |
| amount | uint256 | amount of `token` to transfer from `user` |
| tokenDecimals | uint256 | token decimals |

### _tokenTransferToUser

```solidity
function _tokenTransferToUser(address token, address to, uint256 amount, uint256 tokenDecimals) internal
```

_do safeTransfer on a given token
and converts `amount` from base18
to amount with a correct precision. Sends tokens
from `contract` to `user`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |
| to | address | address of user |
| amount | uint256 | amount of `token` to transfer from `user` (decimals 18) |
| tokenDecimals | uint256 | token decimals |

### _tokenDecimals

```solidity
function _tokenDecimals(address token) internal view returns (uint8)
```

_retreives decimals of a given `token`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | decimals decinmals value of a given `token` |

### _requireTokenExists

```solidity
function _requireTokenExists(address token) internal view virtual
```

_checks that `token` is presented in `_paymentTokens`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |

### _requireAndUpdateLimit

```solidity
function _requireAndUpdateLimit(uint256 amount) internal
```

_check if operation exceed daily limit and update limit data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | operation amount (decimals 18) |

### _requireAndUpdateAllowance

```solidity
function _requireAndUpdateAllowance(address token, uint256 amount) internal
```

_check if operation exceed token allowance and update allowance_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |
| amount | uint256 | operation amount (decimals 18) |

### _getFeeAmount

```solidity
function _getFeeAmount(address sender, address token, uint256 amount, bool isInstant, uint256 additionalFee) internal view returns (uint256)
```

_returns calculated fee amount depends on parameters
if additionalFee not zero, token fee replaced with additionalFee_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | sender address |
| token | address | token address |
| amount | uint256 | amount of token (decimals 18) |
| isInstant | bool | is instant operation |
| additionalFee | uint256 | fee for fiat operations |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee amount of input token |

### _requireVariationTolerance

```solidity
function _requireVariationTolerance(uint256 prevPrice, uint256 newPrice) internal view
```

_check if prev and new prices diviation fit variationTolerance_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| prevPrice | uint256 | previous rate |
| newPrice | uint256 | new rate |

### _validateUserAccess

```solidity
function _validateUserAccess(address user) internal view
```

### _truncate

```solidity
function _truncate(uint256 value, uint256 decimals) internal pure returns (uint256)
```

_convert value to inputted decimals precision_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | value for format |
| decimals | uint256 | decimals |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | converted amount |

### _validateFee

```solidity
function _validateFee(uint256 fee, bool checkMin) internal pure
```

_check if fee <= 100% and check > 0 if needs_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | fee value |
| checkMin | bool | if need to check minimum |

### _validateAddress

```solidity
function _validateAddress(address addr, bool selfCheck) internal view
```

_check if address not zero and not address(this)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | address to check |
| selfCheck | bool | check if address not address(this) |

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view virtual returns (uint256)
```

_get token rate depends on data feed and stablecoin flag_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dataFeed | address | address of dataFeed from token config |
| stable | bool | is stablecoin |

## MidasInitializable

Base Initializable contract that implements constructor
that calls _disableInitializers() to prevent
initialization of implementation contract

### constructor

```solidity
constructor() internal
```

## WithSanctionsList

Base contract that uses sanctions oracle from
Chainalysis to check that user is not sanctioned

### sanctionsList

```solidity
address sanctionsList
```

address of Chainalysis sanctions oracle

### SetSanctionsList

```solidity
event SetSanctionsList(address caller, address newSanctionsList)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newSanctionsList | address | new address of `sanctionsList` |

### onlyNotSanctioned

```solidity
modifier onlyNotSanctioned(address user)
```

_checks that a given `user` is not sanctioned_

### __WithSanctionsList_init

```solidity
function __WithSanctionsList_init(address _accesControl, address _sanctionsList) internal
```

_upgradeable pattern contract`s initializer_

### __WithSanctionsList_init_unchained

```solidity
function __WithSanctionsList_init_unchained(address _sanctionsList) internal
```

_upgradeable pattern contract`s initializer unchained_

### setSanctionsList

```solidity
function setSanctionsList(address newSanctionsList) external
```

updates `sanctionsList` address.
can be called only from permissioned actor that have
`sanctionsListAdminRole()` role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSanctionsList | address | new sanctions list address |

### sanctionsListAdminRole

```solidity
function sanctionsListAdminRole() public view virtual returns (bytes32)
```

AC role of sanctions list admin

_address that have this role can use `setSanctionsList`_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## Blacklistable

Base contract that implements basic functions and modifiers
to work with blacklistable

### onlyNotBlacklisted

```solidity
modifier onlyNotBlacklisted(address account)
```

_checks that a given `account` doesnt
have BLACKLISTED_ROLE_

### __Blacklistable_init

```solidity
function __Blacklistable_init(address _accessControl) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

### __Blacklistable_init_unchained

```solidity
function __Blacklistable_init_unchained() internal
```

_upgradeable pattern contract`s initializer unchained_

### _onlyNotBlacklisted

```solidity
function _onlyNotBlacklisted(address account) internal view
```

_checks that a given `account` doesnt
have BLACKLISTED_ROLE_

## Greenlistable

Base contract that implements basic functions and modifiers
to work with greenlistable

### GREENLIST_TOGGLER_ROLE

```solidity
bytes32 GREENLIST_TOGGLER_ROLE
```

actor that can change green list enable

### greenlistEnabled

```solidity
bool greenlistEnabled
```

is greenlist enabled

### SetGreenlistEnable

```solidity
event SetGreenlistEnable(address sender, bool enable)
```

### onlyGreenlisted

```solidity
modifier onlyGreenlisted(address account)
```

_checks that a given `account`
have `greenlistedRole()`_

### onlyAlwaysGreenlisted

```solidity
modifier onlyAlwaysGreenlisted(address account)
```

_checks that a given `account`
have `greenlistedRole()`
do the check even if greenlist check is off_

### __Greenlistable_init

```solidity
function __Greenlistable_init(address _accessControl) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

### __Greenlistable_init_unchained

```solidity
function __Greenlistable_init_unchained() internal
```

_upgradeable pattern contract`s initializer unchained_

### setGreenlistEnable

```solidity
function setGreenlistEnable(bool enable) external
```

enable or disable greenlist.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enable | bool | enable |

### greenlistedRole

```solidity
function greenlistedRole() public view virtual returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### greenlistTogglerRole

```solidity
function greenlistTogglerRole() public view virtual returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _onlyGreenlistToggler

```solidity
function _onlyGreenlistToggler(address account) internal view
```

_checks that a given `account`
have a `greenlistTogglerRole()`_

## MidasAccessControl

Smart contract that stores all roles for Midas project

### initialize

```solidity
function initialize() external
```

upgradeable pattern contract`s initializer

### grantRoleMult

```solidity
function grantRoleMult(bytes32[] roles, address[] addresses) external
```

grant multiple roles to multiple users
in one transaction

_length`s of 2 arays should match_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | array of bytes32 roles |
| addresses | address[] | array of user addresses |

### revokeRoleMult

```solidity
function revokeRoleMult(bytes32[] roles, address[] addresses) external
```

revoke multiple roles from multiple users
in one transaction

_length`s of 2 arays should match_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | array of bytes32 roles |
| addresses | address[] | array of user addresses |

### renounceRole

```solidity
function renounceRole(bytes32, address) public pure
```

## MidasAccessControlRoles

Base contract that stores all roles descriptors

### GREENLIST_OPERATOR_ROLE

```solidity
bytes32 GREENLIST_OPERATOR_ROLE
```

actor that can change green list statuses of addresses

### BLACKLIST_OPERATOR_ROLE

```solidity
bytes32 BLACKLIST_OPERATOR_ROLE
```

actor that can change black list statuses of addresses

### M_TBILL_MINT_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_MINT_OPERATOR_ROLE
```

actor that can mint mTBILL

### M_TBILL_BURN_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_BURN_OPERATOR_ROLE
```

actor that can burn mTBILL

### M_TBILL_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_TBILL_PAUSE_OPERATOR_ROLE
```

actor that can pause mTBILL

### DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DEPOSIT_VAULT_ADMIN_ROLE
```

actor that have admin rights in deposit vault

### REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 REDEMPTION_VAULT_ADMIN_ROLE
```

actor that have admin rights in redemption vault

### GREENLISTED_ROLE

```solidity
bytes32 GREENLISTED_ROLE
```

actor that is greenlisted

### BLACKLISTED_ROLE

```solidity
bytes32 BLACKLISTED_ROLE
```

actor that is blacklisted

## Pausable

Base contract that implements basic functions and modifiers
with pause functionality

### fnPaused

```solidity
mapping(bytes4 => bool) fnPaused
```

### PauseFn

```solidity
event PauseFn(address caller, bytes4 fn)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | caller address (msg.sender) |
| fn | bytes4 | function id |

### UnpauseFn

```solidity
event UnpauseFn(address caller, bytes4 fn)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | caller address (msg.sender) |
| fn | bytes4 | function id |

### whenFnNotPaused

```solidity
modifier whenFnNotPaused(bytes4 fn)
```

### onlyPauseAdmin

```solidity
modifier onlyPauseAdmin()
```

_checks that a given `account`
has a determinedPauseAdminRole_

### __Pausable_init

```solidity
function __Pausable_init(address _accessControl) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl contract address |

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

### pauseFn

```solidity
function pauseFn(bytes4 fn) external
```

_pause specific function_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fn | bytes4 | function id |

### unpauseFn

```solidity
function unpauseFn(bytes4 fn) external
```

_unpause specific function_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fn | bytes4 | function id |

### pauseAdminRole

```solidity
function pauseAdminRole() public view virtual returns (bytes32)
```

_virtual function to determine pauseAdmin role_

## WithMidasAccessControl

Base contract that consumes MidasAccessControl

### DEFAULT_ADMIN_ROLE

```solidity
bytes32 DEFAULT_ADMIN_ROLE
```

admin role

### accessControl

```solidity
contract MidasAccessControl accessControl
```

MidasAccessControl contract address

### onlyRole

```solidity
modifier onlyRole(bytes32 role, address account)
```

_checks that given `address` have `role`_

### onlyNotRole

```solidity
modifier onlyNotRole(bytes32 role, address account)
```

_checks that given `address` do not have `role`_

### __WithMidasAccessControl_init

```solidity
function __WithMidasAccessControl_init(address _accessControl) internal
```

_upgradeable pattern contract`s initializer_

### _onlyRole

```solidity
function _onlyRole(bytes32 role, address account) internal view
```

_checks that given `address` have `role`_

### _onlyNotRole

```solidity
function _onlyNotRole(bytes32 role, address account) internal view
```

_checks that given `address` do not have `role`_

## EUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for eUSD contracts

### E_USD_VAULT_ROLES_OPERATOR

```solidity
bytes32 E_USD_VAULT_ROLES_OPERATOR
```

actor that can manage vault admin roles

### E_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 E_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage EUsdDepositVault

### E_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 E_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage EUsdRedemptionVault

### E_USD_GREENLIST_OPERATOR_ROLE

```solidity
bytes32 E_USD_GREENLIST_OPERATOR_ROLE
```

actor that can change eUSD green list statuses of addresses

### E_USD_GREENLISTED_ROLE

```solidity
bytes32 E_USD_GREENLISTED_ROLE
```

actor that is greenlisted in eUSD

## EUsdRedemptionVault

Smart contract that handles eUSD redeeming

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

### greenlistedRole

```solidity
function greenlistedRole() public pure returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## EUsdRedemptionVaultWithBUIDL

Smart contract that handles eUSD redeeming

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

### greenlistedRole

```solidity
function greenlistedRole() public pure returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## HBUsdtMidasAccessControlRoles

Base contract that stores all roles descriptors for hbUSDT contracts

### HB_USDT_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_USDT_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HBUsdtDepositVault

### HB_USDT_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_USDT_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HBUsdtRedemptionVault

### HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HBUsdtCustomAggregatorFeed and HBUsdtDataFeed

## HBUsdtRedemptionVaultWithSwapper

Smart contract that handles hbUSDT redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HBXautMidasAccessControlRoles

Base contract that stores all roles descriptors for hbXAUt contracts

### HB_XAUT_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_XAUT_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HBXautDepositVault

### HB_XAUT_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_XAUT_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HBXautRedemptionVault

### HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HBXautCustomAggregatorFeed and HBXautDataFeed

## HBXautRedemptionVaultWithSwapper

Smart contract that handles hbXAUt redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for hypeBTC contracts

### HYPE_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HypeBtcDepositVault

### HYPE_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HypeBtcRedemptionVault

### HYPE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HYPE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HypeBtcCustomAggregatorFeed and HypeBtcDataFeed

## HypeBtcRedemptionVaultWithSwapper

Smart contract that handles hypeBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeEthMidasAccessControlRoles

Base contract that stores all roles descriptors for hypeETH contracts

### HYPE_ETH_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_ETH_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HypeEthDepositVault

### HYPE_ETH_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_ETH_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HypeEthRedemptionVault

### HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HypeEthCustomAggregatorFeed and HypeEthDataFeed

## HypeEthRedemptionVaultWithSwapper

Smart contract that handles hypeETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for hypeUSD contracts

### HYPE_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HypeUsdDepositVault

### HYPE_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HYPE_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HypeUsdRedemptionVault

### HYPE_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HYPE_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HypeUsdCustomAggregatorFeed and HypeUsdDataFeed

## HypeUsdRedemptionVaultWithSwapper

Smart contract that handles hypeUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## IDataFeed

### initialize

```solidity
function initialize(address _ac, address _aggregator, uint256 _healthyDiff, int256 _minExpectedAnswer, int256 _maxExpectedAnswer) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | AggregatorV3Interface contract address |
| _healthyDiff | uint256 | max. staleness time for data feed answers |
| _minExpectedAnswer | int256 | min.expected answer value from data feed |
| _maxExpectedAnswer | int256 | max.expected answer value from data feed |

### changeAggregator

```solidity
function changeAggregator(address _aggregator) external
```

updates `aggregator` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _aggregator | address | new AggregatorV3Interface contract address |

### getDataInBase18

```solidity
function getDataInBase18() external view returns (uint256 answer)
```

fetches answer from aggregator
and converts it to the base18 precision

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### feedAdminRole

```solidity
function feedAdminRole() external view returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## IMTbill

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mTBILL token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns mTBILL token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### setMetadata

```solidity
function setMetadata(bytes32 key, bytes data) external
```

updates contract`s metadata.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | metadata map. key |
| data | bytes | metadata map. value |

### pause

```solidity
function pause() external
```

puts mTBILL token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mTBILL token on pause.
should be called only from permissioned actor

## TokenConfig

```solidity
struct TokenConfig {
  address dataFeed;
  uint256 fee;
  uint256 allowance;
  bool stable;
}
```

## RequestStatus

```solidity
enum RequestStatus {
  Pending,
  Processed,
  Canceled
}
```

## MTokenInitParams

```solidity
struct MTokenInitParams {
  address mToken;
  address mTokenDataFeed;
}
```

## ReceiversInitParams

```solidity
struct ReceiversInitParams {
  address tokensReceiver;
  address feeReceiver;
}
```

## InstantInitParams

```solidity
struct InstantInitParams {
  uint256 instantFee;
  uint256 instantDailyLimit;
}
```

## IManageableVault

### WithdrawToken

```solidity
event WithdrawToken(address caller, address token, address withdrawTo, uint256 amount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| token | address | token that was withdrawn |
| withdrawTo | address | address to which tokens were withdrawn |
| amount | uint256 | `token` transfer amount |

### AddPaymentToken

```solidity
event AddPaymentToken(address caller, address token, address dataFeed, uint256 fee, bool stable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| token | address | address of token that |
| dataFeed | address | token dataFeed address |
| fee | uint256 | fee 1% = 100 |
| stable | bool | stablecoin flag |

### ChangeTokenAllowance

```solidity
event ChangeTokenAllowance(address token, address caller, uint256 allowance)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| caller | address | function caller (msg.sender) |
| allowance | uint256 | new allowance |

### ChangeTokenFee

```solidity
event ChangeTokenFee(address token, address caller, uint256 fee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| caller | address | function caller (msg.sender) |
| fee | uint256 | new fee |

### RemovePaymentToken

```solidity
event RemovePaymentToken(address token, address caller)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| caller | address | function caller (msg.sender) |

### AddWaivedFeeAccount

```solidity
event AddWaivedFeeAccount(address account, address caller)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | address of account |
| caller | address | function caller (msg.sender) |

### RemoveWaivedFeeAccount

```solidity
event RemoveWaivedFeeAccount(address account, address caller)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | address of account |
| caller | address | function caller (msg.sender) |

### SetInstantFee

```solidity
event SetInstantFee(address caller, uint256 newFee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newFee | uint256 | new operation fee value |

### SetMinAmount

```solidity
event SetMinAmount(address caller, uint256 newAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newAmount | uint256 | new min amount for operation |

### SetInstantDailyLimit

```solidity
event SetInstantDailyLimit(address caller, uint256 newLimit)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLimit | uint256 | new operation daily limit |

### SetVariationTolerance

```solidity
event SetVariationTolerance(address caller, uint256 newTolerance)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newTolerance | uint256 | percent of price diviation 1% = 100 |

### SetFeeReceiver

```solidity
event SetFeeReceiver(address caller, address reciever)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| reciever | address | new reciever address |

### SetTokensReceiver

```solidity
event SetTokensReceiver(address caller, address reciever)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| reciever | address | new reciever address |

### FreeFromMinAmount

```solidity
event FreeFromMinAmount(address user, bool enable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| enable | bool | is enabled |

### mTokenDataFeed

```solidity
function mTokenDataFeed() external view returns (contract IDataFeed)
```

The mTokenDataFeed contract address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDataFeed | The address of the mTokenDataFeed contract. |

### mToken

```solidity
function mToken() external view returns (contract IMTbill)
```

The mToken contract address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IMTbill | The address of the mToken contract. |

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount, address withdrawTo) external
```

withdraws `amount` of a given `token` from the contract.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |
| withdrawTo | address | withdraw destination address |

### addPaymentToken

```solidity
function addPaymentToken(address token, address dataFeed, uint256 fee, bool stable) external
```

adds a token to the stablecoins list.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| dataFeed | address | dataFeed address |
| fee | uint256 | 1% = 100 |
| stable | bool | is stablecoin flag |

### removePaymentToken

```solidity
function removePaymentToken(address token) external
```

removes a token from stablecoins list.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### changeTokenAllowance

```solidity
function changeTokenAllowance(address token, uint256 allowance) external
```

set new token allowance.
if MAX_UINT = infinite allowance
prev allowance rewrites by new
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| allowance | uint256 | new allowance (decimals 18) |

### changeTokenFee

```solidity
function changeTokenFee(address token, uint256 fee) external
```

set new token fee.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| fee | uint256 | new fee percent 1% = 100 |

### setVariationTolerance

```solidity
function setVariationTolerance(uint256 tolerance) external
```

set new prices diviation percent.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tolerance | uint256 | new prices diviation percent 1% = 100 |

### setMinAmount

```solidity
function setMinAmount(uint256 newAmount) external
```

set new min amount.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAmount | uint256 | min amount for operations in mToken |

### addWaivedFeeAccount

```solidity
function addWaivedFeeAccount(address account) external
```

adds a account to waived fee restriction.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |

### removeWaivedFeeAccount

```solidity
function removeWaivedFeeAccount(address account) external
```

removes a account from waived fee restriction.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |

### setFeeReceiver

```solidity
function setFeeReceiver(address reciever) external
```

set new reciever for fees.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| reciever | address | new fee reciever address |

### setTokensReceiver

```solidity
function setTokensReceiver(address reciever) external
```

set new reciever for tokens.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| reciever | address | new token reciever address |

### setInstantFee

```solidity
function setInstantFee(uint256 newInstantFee) external
```

set operation fee percent.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newInstantFee | uint256 | new instant operations fee percent 1& = 100 |

### setInstantDailyLimit

```solidity
function setInstantDailyLimit(uint256 newInstantDailyLimit) external
```

set operation daily limit.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newInstantDailyLimit | uint256 | new operation daily limit (decimals 18) |

### freeFromMinAmount

```solidity
function freeFromMinAmount(address user, bool enable) external
```

frees given `user` from the minimal deposit
amount validation in `initiateDepositRequest`

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address of user |
| enable | bool |  |

## Request

```solidity
struct Request {
  address sender;
  address tokenOut;
  enum RequestStatus status;
  uint256 amountMToken;
  uint256 mTokenRate;
  uint256 tokenOutRate;
}
```

## FiatRedeptionInitParams

```solidity
struct FiatRedeptionInitParams {
  uint256 fiatAdditionalFee;
  uint256 fiatFlatFee;
  uint256 minFiatRedeemAmount;
}
```

## IRedemptionVault

### RedeemInstant

```solidity
event RedeemInstant(address user, address tokenOut, uint256 amount, uint256 feeAmount, uint256 amountTokenOut)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| amount | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in mToken |
| amountTokenOut | uint256 | amount of tokenOut |

### RedeemInstantWithCustomRecipient

```solidity
event RedeemInstantWithCustomRecipient(address user, address tokenOut, address recipient, uint256 amount, uint256 feeAmount, uint256 amountTokenOut)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address | address that receives tokens |
| amount | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in mToken |
| amountTokenOut | uint256 | amount of tokenOut |

### RedeemRequest

```solidity
event RedeemRequest(uint256 requestId, address user, address tokenOut, uint256 amountMTokenIn, uint256 feeAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| amountMTokenIn | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in mToken |

### RedeemRequestWithCustomRecipient

```solidity
event RedeemRequestWithCustomRecipient(uint256 requestId, address user, address tokenOut, address recipient, uint256 amountMTokenIn, uint256 feeAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address | address that receives tokens |
| amountMTokenIn | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in mToken |

### ApproveRequest

```solidity
event ApproveRequest(uint256 requestId, uint256 newMTokenRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newMTokenRate | uint256 | net mToken rate |

### SafeApproveRequest

```solidity
event SafeApproveRequest(uint256 requestId, uint256 newMTokenRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newMTokenRate | uint256 | net mToken rate |

### RejectRequest

```solidity
event RejectRequest(uint256 requestId, address user)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | address of user |

### SetMinFiatRedeemAmount

```solidity
event SetMinFiatRedeemAmount(address caller, uint256 newMinAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newMinAmount | uint256 | new min amount for fiat requests |

### SetFiatFlatFee

```solidity
event SetFiatFlatFee(address caller, uint256 feeInMToken)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| feeInMToken | uint256 | fee amount in mToken |

### SetFiatAdditionalFee

```solidity
event SetFiatAdditionalFee(address caller, uint256 newfee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newfee | uint256 | new fiat fee percent 1% = 100 |

### SetRequestRedeemer

```solidity
event SetRequestRedeemer(address caller, address redeemer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| redeemer | address | new address of request redeemer |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mTBILL from the user.
Transfers fee in mToken to feeReceiver
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mTBILL to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external
```

Does the same as `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mTBILL to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request if tokenOut not fiat
Transfers amount in mToken to contract
Transfers fee in mToken to feeReceiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipient) external returns (uint256)
```

Does the same as `redeemRequest` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| recipient | address | address that receives tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### redeemFiatRequest

```solidity
function redeemFiatRequest(uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request if tokenOut is fiat
Transfers amount in mToken to contract
Transfers fee in mToken to feeReceiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newMTokenRate) external
```

approving redeem request if not exceed tokenOut allowance
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate inputted by vault admin |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newMTokenRate) external
```

approving request if inputted token rate fit price diviation percent
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate inputted by vault admin |

### rejectRequest

```solidity
function rejectRequest(uint256 requestId) external
```

rejecting request
Sets request flag to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setMinFiatRedeemAmount

```solidity
function setMinFiatRedeemAmount(uint256 newValue) external
```

set new min amount for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min amount |

### setFiatFlatFee

```solidity
function setFiatFlatFee(uint256 feeInMToken) external
```

set fee amount in mToken for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feeInMToken | uint256 | fee amount in mToken |

### setFiatAdditionalFee

```solidity
function setFiatAdditionalFee(uint256 newFee) external
```

set new fee percent for fiat requests

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFee | uint256 | new fee percent 1% = 100 |

### setRequestRedeemer

```solidity
function setRequestRedeemer(address redeemer) external
```

set address which is designated for standard redemptions, allowing tokens to be pulled from this address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| redeemer | address | new address of request redeemer |

## IRedemptionVaultWithSwapper

### SetLiquidityProvider

```solidity
event SetLiquidityProvider(address caller, address provider)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | caller address (msg.sender) |
| provider | address | new LP address |

### SetSwapperVault

```solidity
event SetSwapperVault(address caller, address vault)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | caller address (msg.sender) |
| vault | address | new underlying vault for swapper |

### setLiquidityProvider

```solidity
function setLiquidityProvider(address provider) external
```

sets new liquidity provider address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| provider | address | new liquidity provider address |

### setSwapperVault

```solidity
function setSwapperVault(address vault) external
```

sets new underlying vault for swapper

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vault | address | new underlying vault for swapper |

## ISanctionsList

### isSanctioned

```solidity
function isSanctioned(address addr) external view returns (bool)
```

## IRedemption

### asset

```solidity
function asset() external view returns (address)
```

The asset being redeemed.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the asset token. |

### liquidity

```solidity
function liquidity() external view returns (address)
```

The liquidity token that the asset is being redeemed for.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the liquidity token. |

### settlement

```solidity
function settlement() external view returns (address)
```

The settlement contract address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the settlement contract. |

### redeem

```solidity
function redeem(uint256 amount) external
```

Redeems an amount of asset for liquidity

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of the asset token to redeem |

## IUSTBRedemption

### SUPERSTATE_TOKEN

```solidity
function SUPERSTATE_TOKEN() external view returns (address)
```

### USDC

```solidity
function USDC() external view returns (address)
```

### owner

```solidity
function owner() external view returns (address)
```

### redeem

```solidity
function redeem(uint256 superstateTokenInAmount) external
```

### setRedemptionFee

```solidity
function setRedemptionFee(uint256 _newFee) external
```

### calculateFee

```solidity
function calculateFee(uint256 amount) external view returns (uint256)
```

### calculateUstbIn

```solidity
function calculateUstbIn(uint256 usdcOutAmount) external view returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw)
```

## DecimalsCorrectionLibrary

### convert

```solidity
function convert(uint256 originalAmount, uint256 originalDecimals, uint256 decidedDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with `originalDecimals` into
amount with `decidedDecimals`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| originalDecimals | uint256 | decimals of the original amount |
| decidedDecimals | uint256 | decimals for the output amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with `decidedDecimals` |

### convertFromBase18

```solidity
function convertFromBase18(uint256 originalAmount, uint256 decidedDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with decimals 18 into
amount with `decidedDecimals`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| decidedDecimals | uint256 | decimals for the output amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with `decidedDecimals` |

### convertToBase18

```solidity
function convertToBase18(uint256 originalAmount, uint256 originalDecimals) internal pure returns (uint256)
```

_converts `originalAmount` with `originalDecimals` into
amount with decimals 18_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalAmount | uint256 | amount to convert |
| originalDecimals | uint256 | decimals of the original amount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amount converted amount with 18 decimals |

## MBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for mBTC contracts

### M_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MBtcDepositVault

### M_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MBtcRedemptionVault

### M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MBtcCustomAggregatorFeed and MBtcDataFeed

## MBtcRedemptionVault

Smart contract that handles mBTC redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for TACmBTC contracts

### TAC_M_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TACmBtcDepositVault

### TAC_M_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TACmBtcRedemptionVault

## TACmBtcRedemptionVault

Smart contract that handles TACmBTC redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MBasisMidasAccessControlRoles

Base contract that stores all roles descriptors for mBASIS contracts

### M_BASIS_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_BASIS_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MBasisDepositVault

### M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MBasisRedemptionVault

### M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MBasisCustomAggregatorFeed and MBasisDataFeed

## MBasisRedemptionVault

Smart contract that handles mBASIS minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MBasisRedemptionVaultWithBUIDL

Smart contract that handles mBASIS minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MBasisRedemptionVaultWithSwapper

Smart contract that handles mBASIS redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MEdgeMidasAccessControlRoles

Base contract that stores all roles descriptors for mEDGE contracts

### M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MEdgeDepositVault

### M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MEdgeRedemptionVault

### M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MEdgeCustomAggregatorFeed and MEdgeDataFeed

## MEdgeRedemptionVaultWithSwapper

Smart contract that handles mEDGE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmEdgeMidasAccessControlRoles

Base contract that stores all roles descriptors for TACmEdge contracts

### TAC_M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TACmEdgeDepositVault

### TAC_M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TACmEdgeRedemptionVault

## TACmEdgeRedemptionVault

Smart contract that handles TACmEDGE redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFOneMidasAccessControlRoles

Base contract that stores all roles descriptors for mF-ONE contracts

### M_FONE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_FONE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MFOneDepositVault

### M_FONE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_FONE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MFOneRedemptionVault

### M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MFOneCustomAggregatorFeed and MFOneDataFeed

## MFOneRedemptionVaultWithSwapper

Smart contract that handles mF-ONE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MLiquidityMidasAccessControlRoles

Base contract that stores all roles descriptors for mLIQUIDITY contracts

### M_LIQUIDITY_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_LIQUIDITY_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MLiquidityDepositVault

### M_LIQUIDITY_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_LIQUIDITY_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MLiquidityRedemptionVault

### M_LIQUIDITY_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_LIQUIDITY_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MLiquidityCustomAggregatorFeed and MLiquidityDataFeed

## MLiquidityRedemptionVault

Smart contract that handles mLIQUIDITY redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MMevMidasAccessControlRoles

Base contract that stores all roles descriptors for mMEV contracts

### M_MEV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_MEV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MMevDepositVault

### M_MEV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_MEV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MMevRedemptionVault

### M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MMevCustomAggregatorFeed and MMevDataFeed

## MMevRedemptionVaultWithSwapper

Smart contract that handles mMEV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmMevMidasAccessControlRoles

Base contract that stores all roles descriptors for TACmMEV contracts

### TAC_M_MEV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_MEV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TACmMevDepositVault

### TAC_M_MEV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_M_MEV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TACmMevRedemptionVault

## TACmMevRedemptionVault

Smart contract that handles TACmMEV redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7MidasAccessControlRoles

Base contract that stores all roles descriptors for mRE7 contracts

### M_RE7_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MRe7DepositVault

### M_RE7_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MRe7RedemptionVault

### M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MRe7CustomAggregatorFeed and MRe7DataFeed

## MRe7RedemptionVaultWithSwapper

Smart contract that handles mRE7 redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7SolMidasAccessControlRoles

Base contract that stores all roles descriptors for mRE7SOL contracts

### M_RE7SOL_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7SOL_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MRe7SolDepositVault

### M_RE7SOL_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7SOL_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MRe7SolRedemptionVault

### M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MRe7SolCustomAggregatorFeed and MRe7SolDataFeed

## MRe7SolRedemptionVault

Smart contract that handles mRE7SOL redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSlMidasAccessControlRoles

Base contract that stores all roles descriptors for mSL contracts

### M_SL_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SL_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MSlDepositVault

### M_SL_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SL_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MSlRedemptionVault

### M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MSlCustomAggregatorFeed and MSlDataFeed

## MSlRedemptionVaultWithSwapper

Smart contract that handles mSL redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MevBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for mevBTC contracts

### MEV_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 MEV_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MevBtcDepositVault

### MEV_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 MEV_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MevBtcRedemptionVault

### MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MevBtcCustomAggregatorFeed and MevBtcDataFeed

## MevBtcRedemptionVaultWithSwapper

Smart contract that handles mevBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for tBTC contracts

### T_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 T_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TBtcDepositVault

### T_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 T_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TBtcRedemptionVault

### T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage TBtcCustomAggregatorFeed and TBtcDataFeed

## TBtcRedemptionVaultWithSwapper

Smart contract that handles tBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TEthMidasAccessControlRoles

Base contract that stores all roles descriptors for tETH contracts

### T_ETH_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 T_ETH_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TEthDepositVault

### T_ETH_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 T_ETH_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TEthRedemptionVault

### T_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 T_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage TEthCustomAggregatorFeed and TEthDataFeed

## TEthRedemptionVaultWithSwapper

Smart contract that handles tETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TUsdeMidasAccessControlRoles

Base contract that stores all roles descriptors for tUSDe contracts

### T_USDE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 T_USDE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TUsdeDepositVault

### T_USDE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 T_USDE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TUsdeRedemptionVault

### T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage TUsdeCustomAggregatorFeed and TUsdeDataFeed

## TUsdeRedemptionVaultWithSwapper

Smart contract that handles tUSDe redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## RedemptionVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, struct FiatRedeptionInitParams _fiatRedemptionInitParams, address _requestRedeemer) external
```

### setOverrideGetTokenRate

```solidity
function setOverrideGetTokenRate(bool val) external
```

### setGetTokenRateValue

```solidity
function setGetTokenRateValue(uint256 val) external
```

### calcAndValidateRedeemTest

```solidity
function calcAndValidateRedeemTest(address user, address tokenOut, uint256 amountMTokenIn, bool isInstant, bool isFiat) external returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult)
```

### convertUsdToTokenTest

```solidity
function convertUsdToTokenTest(uint256 amountUsd, address tokenOut) external returns (uint256 amountToken, uint256 tokenRate)
```

### convertMTokenToUsdTest

```solidity
function convertMTokenToUsdTest(uint256 amountMToken) external returns (uint256 amountUsd, uint256 mTokenRate)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

_get token rate depends on data feed and stablecoin flag_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dataFeed | address | address of dataFeed from token config |
| stable | bool | is stablecoin |

## RedemptionVaultWithBUIDLTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## RedemptionVaultWithSwapperTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## RedemptionVaultWithUSTBTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### checkAndRedeemUSTB

```solidity
function checkAndRedeemUSTB(address token, uint256 amount) external
```

## DepositVault

Smart contract that handles mTBILL minting

### CalcAndValidateDepositResult

```solidity
struct CalcAndValidateDepositResult {
  uint256 tokenAmountInUsd;
  uint256 feeTokenAmount;
  uint256 amountTokenWithoutFee;
  uint256 mintAmount;
  uint256 tokenInRate;
  uint256 tokenOutRate;
  uint256 tokenDecimals;
}
```

### minMTokenAmountForFirstDeposit

```solidity
uint256 minMTokenAmountForFirstDeposit
```

minimal USD amount for first user`s deposit

### mintRequests

```solidity
mapping(uint256 => struct Request) mintRequests
```

mapping, requestId => request data

### totalMinted

```solidity
mapping(address => uint256) totalMinted
```

_depositor address => amount minted_

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount, uint256 _minMTokenAmountForFirstDeposit) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | address of MidasAccessControll contract |
| _mTokenInitParams | struct MTokenInitParams | init params for mToken |
| _receiversInitParams | struct ReceiversInitParams | init params for receivers |
| _instantInitParams | struct InstantInitParams | init params for instant operations |
| _sanctionsList | address | address of sanctionsList contract |
| _variationTolerance | uint256 | percent of prices diviation 1% = 100 |
| _minAmount | uint256 | basic min amount for operations in mToken |
| _minMTokenAmountForFirstDeposit | uint256 | min amount for first deposit in mToken |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId) external
```

depositing proccess with auto mint if
account fit daily limit and token allowance.
Transfers token from the user.
Transfers fee in tokenIn to feeReceiver.
Mints mToken to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId, address recipient) external
```

Does the same as `depositInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |
| recipient | address |  |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId) external returns (uint256)
```

depositing proccess with mint request creating if
account fit token allowance.
Transfers token from the user.
Transfers fee in tokenIn to feeReceiver.
Creates mint request.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipient) external returns (uint256)
```

Does the same as `depositRequest` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |
| recipient | address | address that receives the mTokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request if inputted token rate fit price diviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request without price diviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### rejectRequest

```solidity
function rejectRequest(uint256 requestId) external
```

rejecting request
Sets request flag to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setMinMTokenAmountForFirstDeposit

```solidity
function setMinMTokenAmountForFirstDeposit(uint256 newValue) external
```

sets new minimal amount to deposit in EUR.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min. deposit value |

### vaultRole

```solidity
function vaultRole() public pure virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _validateMinAmount

```solidity
function _validateMinAmount(address user, uint256 amountMTokenWithoutFee) internal view
```

_validates that inputted USD amount >= minAmountToDepositInUsd()
and amount >= minAmount()_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| amountMTokenWithoutFee | uint256 | amount of mToken without fee (decimals 18) |

### _depositInstant

```solidity
function _depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, address recipient) internal virtual returns (struct DepositVault.CalcAndValidateDepositResult result)
```

_internal deposit instant logic_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | tokenIn address |
| amountToken | uint256 | amount of tokenIn (decimals 18) |
| minReceiveAmount | uint256 | min amount of mToken to receive (decimals 18) |
| recipient | address | recipient address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct DepositVault.CalcAndValidateDepositResult | calculated deposit result |

### _calcAndValidateDeposit

```solidity
function _calcAndValidateDeposit(address user, address tokenIn, uint256 amountToken, bool isInstant) internal returns (struct DepositVault.CalcAndValidateDepositResult result)
```

_validate deposit and calculate mint amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenIn | address | tokenIn address |
| amountToken | uint256 | tokenIn amount (decimals 18) |
| isInstant | bool | is instant operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct DepositVault.CalcAndValidateDepositResult | calculated deposit result |

### _convertTokenToUsd

```solidity
function _convertTokenToUsd(address tokenIn, uint256 amount) internal view virtual returns (uint256 amountInUsd, uint256 rate)
```

_calculates USD amount from tokenIn amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | tokenIn address |
| amount | uint256 | amount of tokenIn (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountInUsd | uint256 | converted amount to USD |
| rate | uint256 | conversion rate |

### _convertUsdToMToken

```solidity
function _convertUsdToMToken(uint256 amountUsd) internal view virtual returns (uint256 amountMToken, uint256 mTokenRate)
```

_calculates mToken amount from USD amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsd | uint256 | amount of USD (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMToken | uint256 | converted USD to mToken |
| mTokenRate | uint256 | conversion rate |

## EUsdDepositVault

Smart contract that handles eUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

### greenlistedRole

```solidity
function greenlistedRole() public pure returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## HBUsdtDepositVault

Smart contract that handles hbUSDT minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HBXautDepositVault

Smart contract that handles hbXAUt minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeBtcDepositVault

Smart contract that handles hypeBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeEthDepositVault

Smart contract that handles hypeETH minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeUsdDepositVault

Smart contract that handles hypeUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## Request

```solidity
struct Request {
  address sender;
  address tokenIn;
  enum RequestStatus status;
  uint256 depositedUsdAmount;
  uint256 usdAmountWithoutFees;
  uint256 tokenOutRate;
}
```

## IDepositVault

### SetMinMTokenAmountForFirstDeposit

```solidity
event SetMinMTokenAmountForFirstDeposit(address caller, uint256 newValue)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newValue | uint256 | new min amount to deposit value |

### DepositInstant

```solidity
event DepositInstant(address user, address tokenIn, uint256 amountUsd, uint256 amountToken, uint256 fee, uint256 minted, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| amountUsd | uint256 | amount of tokenIn converted to USD |
| amountToken | uint256 | amount of tokenIn |
| fee | uint256 | fee amount in tokenIn |
| minted | uint256 | amount of minted mTokens |
| referrerId | bytes32 | referrer id |

### DepositInstantWithCustomRecipient

```solidity
event DepositInstantWithCustomRecipient(address user, address tokenIn, address recipient, uint256 amountUsd, uint256 amountToken, uint256 fee, uint256 minted, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| recipient | address | address that receives the mTokens |
| amountUsd | uint256 | amount of tokenIn converted to USD |
| amountToken | uint256 | amount of tokenIn |
| fee | uint256 | fee amount in tokenIn |
| minted | uint256 | amount of minted mTokens |
| referrerId | bytes32 | referrer id |

### DepositRequest

```solidity
event DepositRequest(uint256 requestId, address user, address tokenIn, uint256 amountToken, uint256 amountUsd, uint256 fee, uint256 tokenOutRate, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of tokenIn |
| amountUsd | uint256 | amount of tokenIn converted to USD |
| fee | uint256 | fee amount in tokenIn |
| tokenOutRate | uint256 | mToken rate |
| referrerId | bytes32 | referrer id |

### DepositRequestWithCustomRecipient

```solidity
event DepositRequestWithCustomRecipient(uint256 requestId, address user, address tokenIn, address recipient, uint256 amountToken, uint256 amountUsd, uint256 fee, uint256 tokenOutRate, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| recipient | address | address that receives the mTokens |
| amountToken | uint256 | amount of tokenIn |
| amountUsd | uint256 | amount of tokenIn converted to USD |
| fee | uint256 | fee amount in tokenIn |
| tokenOutRate | uint256 | mToken rate |
| referrerId | bytes32 | referrer id |

### ApproveRequest

```solidity
event ApproveRequest(uint256 requestId, uint256 newOutRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newOutRate | uint256 | mToken rate inputted by admin |

### SafeApproveRequest

```solidity
event SafeApproveRequest(uint256 requestId, uint256 newOutRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newOutRate | uint256 | mToken rate inputted by admin |

### RejectRequest

```solidity
event RejectRequest(uint256 requestId, address user)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | address of user |

### FreeFromMinDeposit

```solidity
event FreeFromMinDeposit(address user)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | address that was freed from min deposit check |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId) external
```

depositing proccess with auto mint if
account fit daily limit and token allowance.
Transfers token from the user.
Transfers fee in tokenIn to feeReceiver.
Mints mToken to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId, address tokensReceiver) external
```

Does the same as `depositInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |
| tokensReceiver | address | address to receive the tokens (instead of msg.sender) |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId) external returns (uint256)
```

depositing proccess with mint request creating if
account fit token allowance.
Transfers token from the user.
Transfers fee in tokenIn to feeReceiver.
Creates mint request.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipient) external returns (uint256)
```

Does the same as `depositRequest` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |
| recipient | address | address that receives the mTokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request if inputted token rate fit price diviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request without price diviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### rejectRequest

```solidity
function rejectRequest(uint256 requestId) external
```

rejecting request
Sets request flag to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setMinMTokenAmountForFirstDeposit

```solidity
function setMinMTokenAmountForFirstDeposit(uint256 newValue) external
```

sets new minimal amount to deposit in EUR.
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min. deposit value |

## MBtcDepositVault

Smart contract that handles mBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmBtcDepositVault

Smart contract that handles TACmBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MBasisDepositVault

Smart contract that handles mBASIS minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MEdgeDepositVault

Smart contract that handles mEDGE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmEdgeDepositVault

Smart contract that handles TACmEdge minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFOneDepositVault

Smart contract that handles mF-ONE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MLiquidityDepositVault

Smart contract that handles mLIQUIDITY minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MMevDepositVault

Smart contract that handles mMEV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmMevDepositVault

Smart contract that handles TACmMEV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7DepositVault

Smart contract that handles mRE7 minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7SolDepositVault

Smart contract that handles mRE7SOL minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSlDepositVault

Smart contract that handles mSL minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MevBtcDepositVault

Smart contract that handles mevBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TBtcDepositVault

Smart contract that handles tBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TEthDepositVault

Smart contract that handles tETH minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TUsdeDepositVault

Smart contract that handles tUSDe minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DepositVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### tokenTransferFromToTester

```solidity
function tokenTransferFromToTester(address token, address from, address to, uint256 amount, uint256 tokenDecimals) external
```

### tokenTransferToUserTester

```solidity
function tokenTransferToUserTester(address token, address to, uint256 amount, uint256 tokenDecimals) external
```

### setOverrideGetTokenRate

```solidity
function setOverrideGetTokenRate(bool val) external
```

### setGetTokenRateValue

```solidity
function setGetTokenRateValue(uint256 val) external
```

### calcAndValidateDeposit

```solidity
function calcAndValidateDeposit(address user, address tokenIn, uint256 amountToken, bool isInstant) external returns (struct DepositVault.CalcAndValidateDepositResult)
```

### convertTokenToUsdTest

```solidity
function convertTokenToUsdTest(address tokenIn, uint256 amount) external returns (uint256 amountInUsd, uint256 rate)
```

### convertUsdToMTokenTest

```solidity
function convertUsdToMTokenTest(uint256 amountUsd) external returns (uint256 amountMToken, uint256 mTokenRate)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

_get token rate depends on data feed and stablecoin flag_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dataFeed | address | address of dataFeed from token config |
| stable | bool | is stablecoin |

## ManageableVaultTester

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### initialize

```solidity
function initialize(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _ac, struct MTokenInitParams _mTokenInitParams, struct ReceiversInitParams _receiversInitParams, struct InstantInitParams _instantInitParams, address _sanctionsList, uint256 _variationTolerance, uint256 _minAmount) external
```

### vaultRole

```solidity
function vaultRole() public view virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## SanctionsListMock

### isSanctioned

```solidity
mapping(address => bool) isSanctioned
```

### setSanctioned

```solidity
function setSanctioned(address addr, bool sanctioned) external
```

## eUSD

### E_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 E_USD_MINT_OPERATOR_ROLE
```

actor that can mint eUSD

### E_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 E_USD_BURN_OPERATOR_ROLE
```

actor that can burn eUSD

### E_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 E_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause eUSD

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint eUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn eUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause eUSD token_

## CustomAggregatorV3CompatibleFeed

AggregatorV3 compatible feed, where price is submitted manually by feed admins

### RoundData

```solidity
struct RoundData {
  uint80 roundId;
  int256 answer;
  uint256 startedAt;
  uint256 updatedAt;
  uint80 answeredInRound;
}
```

### description

```solidity
string description
```

feed description

### latestRound

```solidity
uint80 latestRound
```

last round id

### maxAnswerDeviation

```solidity
uint256 maxAnswerDeviation
```

max deviation from lattest price in %

_10 ** decimals() is a percentage precision_

### minAnswer

```solidity
int192 minAnswer
```

minimal possible answer that feed can return

### maxAnswer

```solidity
int192 maxAnswer
```

maximal possible answer that feed can return

### AnswerUpdated

```solidity
event AnswerUpdated(int256 data, uint256 roundId, uint256 timestamp)
```

### onlyAggregatorAdmin

```solidity
modifier onlyAggregatorAdmin()
```

_checks that msg.sender do have a feedAdminRole() role_

### initialize

```solidity
function initialize(address _accessControl, int192 _minAnswer, int192 _maxAnswer, uint256 _maxAnswerDeviation, string _description) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |
| _minAnswer | int192 | init value for `minAnswer`. Should be < `_maxAnswer` |
| _maxAnswer | int192 | init value for `maxAnswer`. Should be > `_minAnswer` |
| _maxAnswerDeviation | uint256 | init value for `maxAnswerDeviation` |
| _description | string | init value for `description` |

### setRoundDataSafe

```solidity
function setRoundDataSafe(int256 _data) external
```

works as `setRoundData()`, but also checks the
deviation with the lattest submitted data

_deviation with previous data needs to be <= `maxAnswerDeviation`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |

### setRoundData

```solidity
function setRoundData(int256 _data) public
```

sets the data for `latestRound` + 1 round id

_`_data` should be >= `minAnswer` and <= `maxAnswer`.
Function should be called only from address with `feedAdminRole()`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### version

```solidity
function version() external pure returns (uint256)
```

### lastAnswer

```solidity
function lastAnswer() public view returns (int256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | answer of lattest price submission |

### lastTimestamp

```solidity
function lastTimestamp() public view returns (uint256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | timestamp of lattest price submission |

### getRoundData

```solidity
function getRoundData(uint80 _roundId) public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### feedAdminRole

```solidity
function feedAdminRole() public view virtual returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

### decimals

```solidity
function decimals() public pure returns (uint8)
```

### _getDeviation

```solidity
function _getDeviation(int256 _lastPrice, int256 _newPrice) internal pure returns (uint256)
```

_calculates a deviation in % between `_lastPrice` and `_newPrice`_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | deviation in `10 ** decimals()` precision |

## CustomAggregatorV3CompatibleFeedDiscounted

AggregatorV3 compatible proxy-feed that discounts the price
of an underlying chainlink compatible feed by a given percentage

### underlyingFeed

```solidity
contract AggregatorV3Interface underlyingFeed
```

the underlying chainlink compatible feed

### discountPercentage

```solidity
uint256 discountPercentage
```

the discount percentage. Expressed in 10 ** decimals() precision
Example: 10 ** decimals() = 1%

### constructor

```solidity
constructor(address _underlyingFeed, uint256 _discountPercentage) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlyingFeed | address | the underlying chainlink compatible feed |
| _discountPercentage | uint256 | the discount percentage. Expressed in 10 ** decimals() precision |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### version

```solidity
function version() external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

### description

```solidity
function description() public view returns (string)
```

### _calculateDiscountedAnswer

```solidity
function _calculateDiscountedAnswer(int256 _answer) internal view returns (int256)
```

_calculates the discounted answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | the answer to discount |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | the discounted answer |

## DataFeed

Wrapper of ChainLink`s AggregatorV3 data feeds

### aggregator

```solidity
contract AggregatorV3Interface aggregator
```

AggregatorV3Interface contract address

### healthyDiff

```solidity
uint256 healthyDiff
```

_healty difference between `block.timestamp` and `updatedAt` timestamps_

### minExpectedAnswer

```solidity
int256 minExpectedAnswer
```

_minimal answer expected to receive from the `aggregator`_

### maxExpectedAnswer

```solidity
int256 maxExpectedAnswer
```

_maximal answer expected to receive from the `aggregator`_

### initialize

```solidity
function initialize(address _ac, address _aggregator, uint256 _healthyDiff, int256 _minExpectedAnswer, int256 _maxExpectedAnswer) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _aggregator | address | AggregatorV3Interface contract address |
| _healthyDiff | uint256 | max. staleness time for data feed answers |
| _minExpectedAnswer | int256 | min.expected answer value from data feed |
| _maxExpectedAnswer | int256 | max.expected answer value from data feed |

### changeAggregator

```solidity
function changeAggregator(address _aggregator) external
```

updates `aggregator` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _aggregator | address | new AggregatorV3Interface contract address |

### setHealthyDiff

```solidity
function setHealthyDiff(uint256 _healthyDiff) external
```

_updates `healthyDiff` value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _healthyDiff | uint256 | new value |

### setMinExpectedAnswer

```solidity
function setMinExpectedAnswer(int256 _minExpectedAnswer) external
```

_updates `minExpectedAnswer` value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minExpectedAnswer | int256 | min value |

### setMaxExpectedAnswer

```solidity
function setMaxExpectedAnswer(int256 _maxExpectedAnswer) external
```

_updates `maxExpectedAnswer` value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | int256 | max value |

### getDataInBase18

```solidity
function getDataInBase18() external view returns (uint256 answer)
```

fetches answer from aggregator
and converts it to the base18 precision

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | fetched aggregator answer |

### feedAdminRole

```solidity
function feedAdminRole() public pure virtual returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HBUsdtCustomAggregatorFeed

AggregatorV3 compatible feed for hbUSDT,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HBUsdtDataFeed

DataFeed for hbUSDT product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hbUSDT

### HB_USDT_MINT_OPERATOR_ROLE

```solidity
bytes32 HB_USDT_MINT_OPERATOR_ROLE
```

actor that can mint hbUSDT

### HB_USDT_BURN_OPERATOR_ROLE

```solidity
bytes32 HB_USDT_BURN_OPERATOR_ROLE
```

actor that can burn hbUSDT

### HB_USDT_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HB_USDT_PAUSE_OPERATOR_ROLE
```

actor that can pause hbUSDT

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hbUSDT token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hbUSDT token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hbUSDT token_

## HBXautCustomAggregatorFeed

AggregatorV3 compatible feed for hbXAUt,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HBXautDataFeed

DataFeed for hbXAUt product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hbXAUt

### HB_XAUT_MINT_OPERATOR_ROLE

```solidity
bytes32 HB_XAUT_MINT_OPERATOR_ROLE
```

actor that can mint hbXAUt

### HB_XAUT_BURN_OPERATOR_ROLE

```solidity
bytes32 HB_XAUT_BURN_OPERATOR_ROLE
```

actor that can burn hbXAUt

### HB_XAUT_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HB_XAUT_PAUSE_OPERATOR_ROLE
```

actor that can pause hbXAUt

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hbXAUt token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hbXAUt token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hbXAUt token_

## HypeBtcCustomAggregatorFeed

AggregatorV3 compatible feed for hypeBTC,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HypeBtcDataFeed

DataFeed for hypeBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hypeBTC

### HYPE_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 HYPE_BTC_MINT_OPERATOR_ROLE
```

actor that can mint hypeBTC

### HYPE_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 HYPE_BTC_BURN_OPERATOR_ROLE
```

actor that can burn hypeBTC

### HYPE_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HYPE_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause hypeBTC

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hypeBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hypeBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hypeBTC token_

## HypeEthCustomAggregatorFeed

AggregatorV3 compatible feed for hypeETH,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HypeEthDataFeed

DataFeed for hypeETH product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hypeETH

### HYPE_ETH_MINT_OPERATOR_ROLE

```solidity
bytes32 HYPE_ETH_MINT_OPERATOR_ROLE
```

actor that can mint hypeETH

### HYPE_ETH_BURN_OPERATOR_ROLE

```solidity
bytes32 HYPE_ETH_BURN_OPERATOR_ROLE
```

actor that can burn hypeETH

### HYPE_ETH_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HYPE_ETH_PAUSE_OPERATOR_ROLE
```

actor that can pause hypeETH

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hypeETH token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hypeETH token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hypeETH token_

## HypeUsdCustomAggregatorFeed

AggregatorV3 compatible feed for hypeUSD,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## HypeUsdDataFeed

DataFeed for hypeUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hypeUSD

### HYPE_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 HYPE_USD_MINT_OPERATOR_ROLE
```

actor that can mint hypeUSD

### HYPE_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 HYPE_USD_BURN_OPERATOR_ROLE
```

actor that can burn hypeUSD

### HYPE_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HYPE_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause hypeUSD

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hypeUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hypeUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hypeUSD token_

## IAllowListV2

### EntityId

### FundPermissionSet

```solidity
event FundPermissionSet(IAllowListV2.EntityId entityId, string fundSymbol, bool permission)
```

An event emitted when an address's permission is changed for a fund.

### ProtocolAddressPermissionSet

```solidity
event ProtocolAddressPermissionSet(address addr, string fundSymbol, bool isAllowed)
```

An event emitted when a protocol's permission is changed for a fund.

### EntityIdSet

```solidity
event EntityIdSet(address addr, uint256 entityId)
```

An event emitted when an address is associated with an entityId

### BadData

```solidity
error BadData()
```

_Thrown when the input for a function is invalid_

### AlreadySet

```solidity
error AlreadySet()
```

_Thrown when the input is already equivalent to the storage being set_

### NonZeroEntityIdMustBeChangedToZero

```solidity
error NonZeroEntityIdMustBeChangedToZero()
```

_An address's entityId can not be changed once set, it can only be unset and then set to a new value_

### AddressHasProtocolPermissions

```solidity
error AddressHasProtocolPermissions()
```

_Thrown when trying to set entityId for an address that has protocol permissions_

### AddressHasEntityId

```solidity
error AddressHasEntityId()
```

_Thrown when trying to set protocol permissions for an address that has an entityId_

### CodeSizeZero

```solidity
error CodeSizeZero()
```

_Thrown when trying to set protocol permissions but the code size is 0_

### Deprecated

```solidity
error Deprecated()
```

_Thrown when a method is no longer supported_

### RenounceOwnershipDisabled

```solidity
error RenounceOwnershipDisabled()
```

_Thrown if an attempt to call `renounceOwnership` is made_

### owner

```solidity
function owner() external view returns (address)
```

### addressEntityIds

```solidity
function addressEntityIds(address addr) external view returns (IAllowListV2.EntityId)
```

Gets the entityId for the provided address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | The address to get the entityId for |

### isAddressAllowedForFund

```solidity
function isAddressAllowedForFund(address addr, string fundSymbol) external view returns (bool)
```

Checks whether an address is allowed to use a fund

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | The address to check permissions for |
| fundSymbol | string | The fund symbol to check permissions for |

### isEntityAllowedForFund

```solidity
function isEntityAllowedForFund(IAllowListV2.EntityId entityId, string fundSymbol) external view returns (bool)
```

Checks whether an Entity is allowed to use a fund

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| entityId | IAllowListV2.EntityId |  |
| fundSymbol | string | The fund symbol to check permissions for |

### setEntityAllowedForFund

```solidity
function setEntityAllowedForFund(IAllowListV2.EntityId entityId, string fundSymbol, bool isAllowed) external
```

Sets whether an Entity is allowed to use a fund

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| entityId | IAllowListV2.EntityId |  |
| fundSymbol | string | The fund symbol to set permissions for |
| isAllowed | bool | The permission value to set |

### setEntityIdForAddress

```solidity
function setEntityIdForAddress(IAllowListV2.EntityId entityId, address addr) external
```

Sets the entityId for a given address. Setting to 0 removes the address from the allowList

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| entityId | IAllowListV2.EntityId | The entityId to associate with an address |
| addr | address | The address to associate with an entityId |

### setEntityIdForMultipleAddresses

```solidity
function setEntityIdForMultipleAddresses(IAllowListV2.EntityId entityId, address[] addresses) external
```

Sets the entity Id for a list of addresses. Setting to 0 removes the address from the allowList

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| entityId | IAllowListV2.EntityId | The entityId to associate with an address |
| addresses | address[] | The addresses to associate with an entityId |

### setProtocolAddressPermission

```solidity
function setProtocolAddressPermission(address addr, string fundSymbol, bool isAllowed) external
```

Sets protocol permissions for an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | The address to set permissions for |
| fundSymbol | string | The fund symbol to set permissions for |
| isAllowed | bool | The permission value to set |

### setProtocolAddressPermissions

```solidity
function setProtocolAddressPermissions(address[] addresses, string fundSymbol, bool isAllowed) external
```

Sets protocol permissions for multiple addresses

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addresses | address[] | The addresses to set permissions for |
| fundSymbol | string | The fund symbol to set permissions for |
| isAllowed | bool | The permission value to set |

### setEntityPermissionsAndAddresses

```solidity
function setEntityPermissionsAndAddresses(IAllowListV2.EntityId entityId, address[] addresses, string[] fundPermissionsToUpdate, bool[] fundPermissions) external
```

Sets entity for an array of addresses and sets permissions for an entity

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| entityId | IAllowListV2.EntityId | The entityId to be updated |
| addresses | address[] | The addresses to associate with an entityId |
| fundPermissionsToUpdate | string[] | The funds to update permissions for |
| fundPermissions | bool[] | The permissions for each fund |

### hasAnyProtocolPermissions

```solidity
function hasAnyProtocolPermissions(address addr) external view returns (bool hasPermissions)
```

### protocolPermissionsForFunds

```solidity
function protocolPermissionsForFunds(address protocol) external view returns (uint256)
```

### protocolPermissions

```solidity
function protocolPermissions(address, string) external view returns (bool)
```

### initialize

```solidity
function initialize() external
```

## ISuperstateToken

### symbol

```solidity
function symbol() external view returns (string)
```

### allowListV2

```solidity
function allowListV2() external view returns (address)
```

## MBtcCustomAggregatorFeed

AggregatorV3 compatible feed for mBTC,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MBtcDataFeed

DataFeed for mBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mBTC

### M_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 M_BTC_MINT_OPERATOR_ROLE
```

actor that can mint mBTC

### M_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 M_BTC_BURN_OPERATOR_ROLE
```

actor that can burn mBTC

### M_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause mBTC

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mBTC token_

## TACmBTC

### TAC_M_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 TAC_M_BTC_MINT_OPERATOR_ROLE
```

actor that can mint TACmBTC

### TAC_M_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 TAC_M_BTC_BURN_OPERATOR_ROLE
```

actor that can burn TACmBTC

### TAC_M_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 TAC_M_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause TACmBTC

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint TACmBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn TACmBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause TACmBTC token_

## MBasisCustomAggregatorFeed

AggregatorV3 compatible feed for mBASIS,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MBasisDataFeed

DataFeed for mBASIS product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mBASIS

### M_BASIS_MINT_OPERATOR_ROLE

```solidity
bytes32 M_BASIS_MINT_OPERATOR_ROLE
```

actor that can mint mBASIS

### M_BASIS_BURN_OPERATOR_ROLE

```solidity
bytes32 M_BASIS_BURN_OPERATOR_ROLE
```

actor that can burn mBASIS

### M_BASIS_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_BASIS_PAUSE_OPERATOR_ROLE
```

actor that can pause mBASIS

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mBASIS token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mBASIS token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mBASIS token_

## MEdgeCustomAggregatorFeed

AggregatorV3 compatible feed for mEDGE,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MEdgeDataFeed

DataFeed for mEDGE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mEDGE

### M_EDGE_MINT_OPERATOR_ROLE

```solidity
bytes32 M_EDGE_MINT_OPERATOR_ROLE
```

actor that can mint mEDGE

### M_EDGE_BURN_OPERATOR_ROLE

```solidity
bytes32 M_EDGE_BURN_OPERATOR_ROLE
```

actor that can burn mEDGE

### M_EDGE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_EDGE_PAUSE_OPERATOR_ROLE
```

actor that can pause mEDGE

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mEDGE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mEDGE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mEDGE token_

## TACmEDGE

### TAC_M_EDGE_MINT_OPERATOR_ROLE

```solidity
bytes32 TAC_M_EDGE_MINT_OPERATOR_ROLE
```

actor that can mint TACmEDGE

### TAC_M_EDGE_BURN_OPERATOR_ROLE

```solidity
bytes32 TAC_M_EDGE_BURN_OPERATOR_ROLE
```

actor that can burn TACmEDGE

### TAC_M_EDGE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 TAC_M_EDGE_PAUSE_OPERATOR_ROLE
```

actor that can pause TACmEDGE

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint TACmEDGE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn TACmEDGE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause TACmEDGE token_

## MFOneCustomAggregatorFeed

AggregatorV3 compatible feed for mF-ONE,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MFOneDataFeed

DataFeed for mF-ONE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mFONE

### M_FONE_MINT_OPERATOR_ROLE

```solidity
bytes32 M_FONE_MINT_OPERATOR_ROLE
```

actor that can mint mF-ONE

### M_FONE_BURN_OPERATOR_ROLE

```solidity
bytes32 M_FONE_BURN_OPERATOR_ROLE
```

actor that can burn mF-ONE

### M_FONE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_FONE_PAUSE_OPERATOR_ROLE
```

actor that can pause mF-ONE

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mF-ONE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mF-ONE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mF-ONE token_

## MLiquidityCustomAggregatorFeed

AggregatorV3 compatible feed for mLIQUIDITY,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MLiquidityDataFeed

DataFeed for mLIQUIDITY product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mLIQUIDITY

### M_LIQUIDITY_MINT_OPERATOR_ROLE

```solidity
bytes32 M_LIQUIDITY_MINT_OPERATOR_ROLE
```

actor that can mint mLIQUIDITY

### M_LIQUIDITY_BURN_OPERATOR_ROLE

```solidity
bytes32 M_LIQUIDITY_BURN_OPERATOR_ROLE
```

actor that can burn mLIQUIDITY

### M_LIQUIDITY_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_LIQUIDITY_PAUSE_OPERATOR_ROLE
```

actor that can pause mLIQUIDITY

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mLIQUIDITY token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mLIQUIDITY token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mLIQUIDITY token_

## MMevCustomAggregatorFeed

AggregatorV3 compatible feed for mMEV,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MMevDataFeed

DataFeed for mMEV product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mMEV

### M_MEV_MINT_OPERATOR_ROLE

```solidity
bytes32 M_MEV_MINT_OPERATOR_ROLE
```

actor that can mint mMEV

### M_MEV_BURN_OPERATOR_ROLE

```solidity
bytes32 M_MEV_BURN_OPERATOR_ROLE
```

actor that can burn mMEV

### M_MEV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_MEV_PAUSE_OPERATOR_ROLE
```

actor that can pause mMEV

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mMEV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mMEV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mMEV token_

## TACmMEV

### TAC_M_MEV_MINT_OPERATOR_ROLE

```solidity
bytes32 TAC_M_MEV_MINT_OPERATOR_ROLE
```

actor that can mint TACmMEV

### TAC_M_MEV_BURN_OPERATOR_ROLE

```solidity
bytes32 TAC_M_MEV_BURN_OPERATOR_ROLE
```

actor that can burn TACmMEV

### TAC_M_MEV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 TAC_M_MEV_PAUSE_OPERATOR_ROLE
```

actor that can pause TACmMEV

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint TACmMEV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn TACmMEV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause TACmMEV token_

## MRe7CustomAggregatorFeed

AggregatorV3 compatible feed for mRE7,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MRe7DataFeed

DataFeed for mRE7 product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mRE7

### M_RE7_MINT_OPERATOR_ROLE

```solidity
bytes32 M_RE7_MINT_OPERATOR_ROLE
```

actor that can mint mRE7

### M_RE7_BURN_OPERATOR_ROLE

```solidity
bytes32 M_RE7_BURN_OPERATOR_ROLE
```

actor that can burn mRE7

### M_RE7_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_RE7_PAUSE_OPERATOR_ROLE
```

actor that can pause mRE7

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mRE7 token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mRE7 token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mRE7 token_

## MRe7SolCustomAggregatorFeed

AggregatorV3 compatible feed for mRE7SOL,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MRe7SolDataFeed

DataFeed for mRE7SOL product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mRE7SOL

### M_RE7SOL_MINT_OPERATOR_ROLE

```solidity
bytes32 M_RE7SOL_MINT_OPERATOR_ROLE
```

actor that can mint mRE7SOL

### M_RE7SOL_BURN_OPERATOR_ROLE

```solidity
bytes32 M_RE7SOL_BURN_OPERATOR_ROLE
```

actor that can burn mRE7SOL

### M_RE7SOL_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_RE7SOL_PAUSE_OPERATOR_ROLE
```

actor that can pause mRE7SOL

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mRE7SOL token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mRE7SOL token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mRE7SOL token_

## MSlCustomAggregatorFeed

AggregatorV3 compatible feed for mSL,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MSlDataFeed

DataFeed for mSL product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mSL

### M_SL_MINT_OPERATOR_ROLE

```solidity
bytes32 M_SL_MINT_OPERATOR_ROLE
```

actor that can mint mSL

### M_SL_BURN_OPERATOR_ROLE

```solidity
bytes32 M_SL_BURN_OPERATOR_ROLE
```

actor that can burn mSL

### M_SL_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_SL_PAUSE_OPERATOR_ROLE
```

actor that can pause mSL

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mSL token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mSL token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mSL token_

## MTBillCustomAggregatorFeed

AggregatorV3 compatible feed for mTBILL,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MTBillDataFeed

DataFeed for mBASIS product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MTBillMidasAccessControlRoles

Base contract that stores all roles descriptors for mBASIS contracts

### M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MTBillCustomAggregatorFeed and MTBillDataFeed

## mTBILL

### metadata

```solidity
mapping(bytes32 => bytes) metadata
```

metadata key => metadata value

### initialize

```solidity
function initialize(address _accessControl) external virtual
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mTBILL token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns mTBILL token `amount` to a given `to` address.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### pause

```solidity
function pause() external
```

puts mTBILL token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mTBILL token on pause.
should be called only from permissioned actor

### setMetadata

```solidity
function setMetadata(bytes32 key, bytes data) external
```

updates contract`s metadata.
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | metadata map. key |
| data | bytes | metadata map. value |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual
```

_overrides _beforeTokenTransfer function to ban
blaclisted users from using the token functions_

### _minterRole

```solidity
function _minterRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can mint mTBILL token_

### _burnerRole

```solidity
function _burnerRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can burn mTBILL token_

### _pauserRole

```solidity
function _pauserRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can pause mTBILL token_

## MevBtcCustomAggregatorFeed

AggregatorV3 compatible feed for mevBTC,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MevBtcDataFeed

DataFeed for mevBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mevBTC

### MEV_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 MEV_BTC_MINT_OPERATOR_ROLE
```

actor that can mint mevBTC

### MEV_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 MEV_BTC_BURN_OPERATOR_ROLE
```

actor that can burn mevBTC

### MEV_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 MEV_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause mevBTC

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mevBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mevBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mevBTC token_

## IStdReference

### ReferenceData

```solidity
struct ReferenceData {
  uint256 rate;
  uint256 lastUpdatedBase;
  uint256 lastUpdatedQuote;
}
```

### getReferenceData

```solidity
function getReferenceData(string _base, string _quote) external view returns (struct IStdReference.ReferenceData)
```

Returns the price data for the given base/quote pair. Revert if not available.

### getReferenceDataBulk

```solidity
function getReferenceDataBulk(string[] _bases, string[] _quotes) external view returns (struct IStdReference.ReferenceData[])
```

Similar to getReferenceData, but with multiple base/quote pairs at once.

## BandStdChailinkAdapter

### ref

```solidity
contract IStdReference ref
```

### base

```solidity
string base
```

### quote

```solidity
string quote
```

### constructor

```solidity
constructor(address _ref, string _base, string _quote) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IMantleLspStaking

### mETHToETH

```solidity
function mETHToETH(uint256 mETHAmount) external view returns (uint256)
```

## MantleLspStakingAdapter

example https://etherscan.io/address/0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f

### lspStaking

```solidity
contract IMantleLspStaking lspStaking
```

### constructor

```solidity
constructor(address _lspStaking) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## PythChainlinkAdapter

### constructor

```solidity
constructor(address _pyth, bytes32 _priceId) public
```

## IRsEth

### rsETHPrice

```solidity
function rsETHPrice() external view returns (uint256)
```

## RsEthAdapter

example https://etherscan.io/address/0x349A73444b1a310BAe67ef67973022020d70020d

### rsEth

```solidity
contract IRsEth rsEth
```

### constructor

```solidity
constructor(address _rsEth) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IStakedUSDe

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external view returns (uint256)
```

## StakedUSDeAdapter

example https://etherscan.io/address/0x9D39A5DE30e57443BfF2A8307A4256c8797A3497

### stakedUSDe

```solidity
contract IStakedUSDe stakedUSDe
```

### constructor

```solidity
constructor(address _stakedUSDe) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## StorkChainlinkAdapter

### TIMESTAMP_DIVIDER

```solidity
uint256 TIMESTAMP_DIVIDER
```

### priceId

```solidity
bytes32 priceId
```

### stork

```solidity
contract IStorkTemporalNumericValueUnsafeGetter stork
```

### constructor

```solidity
constructor(address _stork, bytes32 _priceId) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IStorkTemporalNumericValueUnsafeGetter

### getTemporalNumericValueUnsafeV1

```solidity
function getTemporalNumericValueUnsafeV1(bytes32 id) external view returns (struct StorkStructs.TemporalNumericValue value)
```

## StorkStructs

### TemporalNumericValue

```solidity
struct TemporalNumericValue {
  uint64 timestampNs;
  int192 quantizedValue;
}
```

## TransparentUpgradeableProxyCopy

### constructor

```solidity
constructor(address _logic, address admin_, bytes _data) public payable
```

## IWrappedEEth

### getRate

```solidity
function getRate() external view returns (uint256)
```

## WrappedEEthAdapter

example https://etherscan.io/address/0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee

### wrappedEEth

```solidity
contract IWrappedEEth wrappedEEth
```

### constructor

```solidity
constructor(address _wrappedEEth) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IWstEth

### stEthPerToken

```solidity
function stEthPerToken() external view returns (uint256)
```

## WstEthAdapter

example https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0

### wstEth

```solidity
contract IWstEth wstEth
```

### constructor

```solidity
constructor(address _wstEth) public
```

### decimals

```solidity
function decimals() external pure returns (uint8)
```

### description

```solidity
function description() public pure returns (string)
```

### version

```solidity
function version() public pure returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRound

```solidity
function latestRound() public view returns (uint256)
```

### getAnswer

```solidity
function getAnswer(uint256) public view returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external view returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## AggregatorV3DeprecatedMock

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### setRoundData

```solidity
function setRoundData(int256 _data) external
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## AggregatorV3Mock

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### setRoundData

```solidity
function setRoundData(int256 _data) external
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## AggregatorV3UnhealthyMock

### decimals

```solidity
function decimals() external view returns (uint8)
```

### description

```solidity
function description() external view returns (string)
```

### version

```solidity
function version() external view returns (uint256)
```

### setRoundData

```solidity
function setRoundData(int256 _data) external
```

### getRoundData

```solidity
function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## ERC20Mock

### constructor

```solidity
constructor(uint8 decimals_) public
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

## ERC20MockWithName

### constructor

```solidity
constructor(uint8 decimals_, string name, string symb) public
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

_Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

Tokens usually opt for a value of 18, imitating the relationship between
Ether and Wei. This is the value {ERC20} uses, unless this function is
overridden;

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}._

## RedemptionTest

### asset

```solidity
address asset
```

The asset being redeemed.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### liquidity

```solidity
address liquidity
```

The liquidity token that the asset is being redeemed for.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### constructor

```solidity
constructor(address _asset, address _liquidity) public
```

### settlement

```solidity
function settlement() external view returns (address)
```

The settlement contract address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the settlement contract. |

### redeem

```solidity
function redeem(uint256 amount) external
```

Redeems an amount of asset for liquidity

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of the asset token to redeem |

## USTBRedemptionMock

### USDC_DECIMALS

```solidity
uint256 USDC_DECIMALS
```

### USDC_PRECISION

```solidity
uint256 USDC_PRECISION
```

### SUPERSTATE_TOKEN_DECIMALS

```solidity
uint256 SUPERSTATE_TOKEN_DECIMALS
```

### SUPERSTATE_TOKEN_PRECISION

```solidity
uint256 SUPERSTATE_TOKEN_PRECISION
```

### FEE_DENOMINATOR

```solidity
uint256 FEE_DENOMINATOR
```

### CHAINLINK_FEED_PRECISION

```solidity
uint256 CHAINLINK_FEED_PRECISION
```

### SUPERSTATE_TOKEN

```solidity
contract IERC20 SUPERSTATE_TOKEN
```

### USDC

```solidity
contract IERC20 USDC
```

### redemptionFee

```solidity
uint256 redemptionFee
```

### _maxUstbRedemptionAmount

```solidity
uint256 _maxUstbRedemptionAmount
```

### constructor

```solidity
constructor(address ustbToken, address usdcToken) public
```

### calculateFee

```solidity
function calculateFee(uint256 amount) public view returns (uint256)
```

### calculateUstbIn

```solidity
function calculateUstbIn(uint256 usdcOutAmount) public view returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw)
```

### calculateUsdcOut

```solidity
function calculateUsdcOut(uint256 superstateTokenInAmount) external view returns (uint256 usdcOutAmountAfterFee, uint256 usdPerUstbChainlinkRaw)
```

### _calculateUsdcOut

```solidity
function _calculateUsdcOut(uint256 superstateTokenInAmount) internal view returns (uint256 usdcOutAmountAfterFee, uint256 usdcOutAmountBeforeFee, uint256 usdPerUstbChainlinkRaw)
```

### maxUstbRedemptionAmount

```solidity
function maxUstbRedemptionAmount() external view returns (uint256 superstateTokenAmount, uint256 usdPerUstbChainlinkRaw)
```

### redeem

```solidity
function redeem(uint256 superstateTokenInAmount) external
```

### redeem

```solidity
function redeem(address to, uint256 superstateTokenInAmount) external
```

### _redeem

```solidity
function _redeem(address to, uint256 superstateTokenInAmount) internal
```

### withdraw

```solidity
function withdraw(address _token, address to, uint256 amount) external
```

### _getChainlinkPrice

```solidity
function _getChainlinkPrice() internal view returns (bool _isBadData, uint256 _updatedAt, uint256 _price)
```

### _requireNotPaused

```solidity
function _requireNotPaused() internal view
```

### setRedemptionFee

```solidity
function setRedemptionFee(uint256 fee) external
```

### setChainlinkData

```solidity
function setChainlinkData(uint256 price, bool isBadData) external
```

### setPaused

```solidity
function setPaused(bool paused) external
```

### setMaxUstbRedemptionAmount

```solidity
function setMaxUstbRedemptionAmount(uint256 maxUstbRedemptionAmount_) external
```

## TBtcCustomAggregatorFeed

AggregatorV3 compatible feed for tBTC,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## TBtcDataFeed

DataFeed for tBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## tBTC

### T_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 T_BTC_MINT_OPERATOR_ROLE
```

actor that can mint tBTC

### T_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 T_BTC_BURN_OPERATOR_ROLE
```

actor that can burn tBTC

### T_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 T_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause tBTC

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint tBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn tBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause tBTC token_

## TEthCustomAggregatorFeed

AggregatorV3 compatible feed for tETH,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## TEthDataFeed

DataFeed for tETH product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## tETH

### T_ETH_MINT_OPERATOR_ROLE

```solidity
bytes32 T_ETH_MINT_OPERATOR_ROLE
```

actor that can mint tETH

### T_ETH_BURN_OPERATOR_ROLE

```solidity
bytes32 T_ETH_BURN_OPERATOR_ROLE
```

actor that can burn tETH

### T_ETH_PAUSE_OPERATOR_ROLE

```solidity
bytes32 T_ETH_PAUSE_OPERATOR_ROLE
```

actor that can pause tETH

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint tETH token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn tETH token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause tETH token_

## TUsdeCustomAggregatorFeed

AggregatorV3 compatible feed for tUSDe,
where price is submitted manually by feed admins

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## TUsdeDataFeed

DataFeed for tUSDe product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## tUSDe

### T_USDE_MINT_OPERATOR_ROLE

```solidity
bytes32 T_USDE_MINT_OPERATOR_ROLE
```

actor that can mint tUSDe

### T_USDE_BURN_OPERATOR_ROLE

```solidity
bytes32 T_USDE_BURN_OPERATOR_ROLE
```

actor that can burn tUSDe

### T_USDE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 T_USDE_PAUSE_OPERATOR_ROLE
```

actor that can pause tUSDe

### initialize

```solidity
function initialize(address _accessControl) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint tUSDe token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn tUSDe token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause tUSDe token_

## BlacklistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### initializeUnchainedWithoutInitializer

```solidity
function initializeUnchainedWithoutInitializer() external
```

### onlyNotBlacklistedTester

```solidity
function onlyNotBlacklistedTester(address account) external
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## CustomAggregatorV3CompatibleFeedDiscountedTester

### constructor

```solidity
constructor(address _underlyingFeed, uint256 _discountPercentage) public
```

### getDiscountedAnswer

```solidity
function getDiscountedAnswer(int256 _answer) public view returns (int256)
```

## CustomAggregatorV3CompatibleFeedTester

### CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

### getDeviation

```solidity
function getDeviation(int256 _lastPrice, int256 _newPrice) public pure returns (uint256)
```

## DataFeedTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## DecimalsCorrectionTester

### convertAmountFromBase18Public

```solidity
function convertAmountFromBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

### convertAmountToBase18Public

```solidity
function convertAmountToBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

## GreenlistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### initializeUnchainedWithoutInitializer

```solidity
function initializeUnchainedWithoutInitializer() external
```

### onlyGreenlistedTester

```solidity
function onlyGreenlistedTester(address account) external
```

### onlyGreenlistTogglerTester

```solidity
function onlyGreenlistTogglerTester(address account) external view
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## MidasAccessControlTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## PausableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

_virtual function to determine pauseAdmin role_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## WithMidasAccessControlTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### grantRoleTester

```solidity
function grantRoleTester(bytes32 role, address account) external
```

### revokeRoleTester

```solidity
function revokeRoleTester(bytes32 role, address account) external
```

### withOnlyRole

```solidity
function withOnlyRole(bytes32 role, address account) external
```

### withOnlyNotRole

```solidity
function withOnlyNotRole(bytes32 role, address account) external
```

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## WithSanctionsListTester

### initialize

```solidity
function initialize(address _accessControl, address _sanctionsList) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl, address _sanctionsList) external
```

### initializeUnchainedWithoutInitializer

```solidity
function initializeUnchainedWithoutInitializer(address _sanctionsList) external
```

### onlyNotSanctionedTester

```solidity
function onlyNotSanctionedTester(address user) public
```

### sanctionsListAdminRole

```solidity
function sanctionsListAdminRole() public pure returns (bytes32)
```

AC role of sanctions list admin

_address that have this role can use `setSanctionsList`_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

## mTBILLTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

