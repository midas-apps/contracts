# Solidity API

## DepositVault

Smart contract that handles mToken minting

### CalcAndValidateDepositResult

return data of _calcAndValidateDeposit
packed into a struct to avoid stack too deep errors

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
mapping(uint256 => struct RequestV2) mintRequests
```

request data storage

_mapping, requestId => request data_

### totalMinted

```solidity
mapping(address => uint256) totalMinted
```

_how much mTokens were minted by the depositor
depositor address => amount minted_

### maxSupplyCap

```solidity
uint256 maxSupplyCap
```

max supply cap value in mToken

_if after the deposit, mToken.totalSupply() > maxSupplyCap,
the tx will be reverted_

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, uint256 _minMTokenAmountForFirstDeposit, uint256 _maxSupplyCap) public
```

upgradeable pattern contract`s initializer

_Calls all versioned initializers (V1, V2, ...) in chronological order.
This ensures that every deployment, whether fresh or upgraded, ends up
initialized to the latest contract state without breaking the
initializer/reinitializer versioning rules._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _minMTokenAmountForFirstDeposit | uint256 | min amount for first deposit in mToken |
| _maxSupplyCap | uint256 | max supply cap for mToken |

### initializeV1

```solidity
function initializeV1(struct CommonVaultInitParams _commonVaultInitParams, uint256 _minMTokenAmountForFirstDeposit) public
```

v1 initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _minMTokenAmountForFirstDeposit | uint256 | min amount for first deposit in mToken |

### initializeV2

```solidity
function initializeV2(uint256 _maxSupplyCap) public
```

v2 initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxSupplyCap | uint256 | max supply cap for mToken |

### initializeV3

```solidity
function initializeV3(struct CommonVaultV2InitParams _commonVaultV2InitParams) public
```

v2 initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |

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

Does the same as original `depositInstant` but allows specifying a custom tokensReceiver address.

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

Does the same as original `depositRequest` but allows specifying a custom tokensReceiver address.

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

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256)
```

Instantly deposits `instantShare` amount of `amountMTokenIn` and creates a request for the remaining amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |
| recipientRequest | address | address that receives the mTokens for the request part |
| instantShare | uint256 | % amount of `amountToken` that will be deposited instantly |
| minReceiveAmountInstantShare | uint256 | min receive amount for the instant share |
| recipientInstant | address | address that receives the mTokens for the instant part |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the mToken rate from the request.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the current mToken rate.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the current mToken rate.
Does same validation as `safeApproveRequestAvgRate`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds, uint256 newOutRate) external
```

approving requests from the `requestIds` array using the `newOutRate`.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| newOutRate | uint256 | new mToken rate inputted by vault admin |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds, uint256 avgMTokenRate) external
```

approving requests from the `requestIds` array using the `newOutRate`.
Does same validation as `safeApproveRequestAvgRate`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request if inputted token rate fit price deviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### safeApproveRequestAvgRate

```solidity
function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request if inputted token rate fit price deviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### approveRequestAvgRate

```solidity
function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### setMaxSupplyCap

```solidity
function setMaxSupplyCap(uint256 newValue) external
```

sets new max supply cap value
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max supply cap value |

### vaultRole

```solidity
function vaultRole() public pure virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _safeBulkApproveRequest

```solidity
function _safeBulkApproveRequest(uint256[] requestIds, uint256 newOutRate, bool isAvgRate) internal
```

_internal function to approve requests_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids |
| newOutRate | uint256 | new out rate |
| isAvgRate | bool | if true, newOutRate is avg rate |

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

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_internal transfer tokens to tokens receiver (instant deposits)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | tokenIn address |
| amountToken | uint256 | amount of tokenIn (decimals 18) |
| tokensDecimals | uint256 | tokens decimals |

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_internal transfer tokens to tokens receiver (deposit requests)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | tokenIn address |
| amountToken | uint256 | amount of tokenIn (decimals 18) |
| tokensDecimals | uint256 | tokens decimals |

### _validateRequest

```solidity
function _validateRequest(address validateAddress, enum RequestStatus status) internal pure
```

validates request
if exist
if not processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validateAddress | address | address to check if not zero |
| status | enum RequestStatus | request status |

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

### _validateMaxSupplyCap

```solidity
function _validateMaxSupplyCap(bool revertOnError) internal view returns (bool)
```

_validates that mToken.totalSupply() <= maxSupplyCap_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| revertOnError | bool | if true, will revert if supply is exceeded if false, will return false if supply is exceeded without reverting |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if supply is valid, false otherwise |

### _validateMaxSupplyCap

```solidity
function _validateMaxSupplyCap(uint256 mintAmount, bool revertOnError) internal view returns (bool)
```

_validates that mToken.totalSupply() <= maxSupplyCap_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mintAmount | uint256 | amount of mToken to mint |
| revertOnError | bool | if true, will revert if supply is exceeded if false, will return false if supply is exceeded without reverting |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if supply is valid, false otherwise |

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

### _calculateHoldbackPartRateFromAvg

```solidity
function _calculateHoldbackPartRateFromAvg(struct RequestV2 request, uint256 avgMTokenRate) internal pure returns (uint256)
```

_calculates holdback part rate from avg rate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct RequestV2 | request |
| avgMTokenRate | uint256 | avg mToken rate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | holdback part rate |

## DepositVaultWithAave

Smart contract that handles mToken minting and invests
proceeds into Aave V3 Pool

_If `aaveDepositsEnabled` is false, regular deposit flow is used_

### aavePools

```solidity
mapping(address => contract IAaveV3Pool) aavePools
```

mapping payment token to Aave V3 Pool

### aaveDepositsEnabled

```solidity
bool aaveDepositsEnabled
```

Whether Aave auto-invest deposits are enabled

_if false, regular deposit flow will be used_

### autoInvestFallbackEnabled

```solidity
bool autoInvestFallbackEnabled
```

Whether to fall back to raw token transfer on auto-invest failure

_if false, the transaction will revert when auto-invest fails_

### SetAavePool

```solidity
event SetAavePool(address caller, address token, address pool)
```

Emitted when an Aave V3 Pool is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |
| pool | address | Aave V3 Pool address |

### RemoveAavePool

```solidity
event RemoveAavePool(address caller, address token)
```

Emitted when an Aave V3 Pool is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |

### SetAaveDepositsEnabled

```solidity
event SetAaveDepositsEnabled(bool enabled)
```

Emitted when `aaveDepositsEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether Aave deposits are enabled |

### SetAutoInvestFallbackEnabled

```solidity
event SetAutoInvestFallbackEnabled(bool enabled)
```

Emitted when `autoInvestFallbackEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether fallback to raw transfer is enabled |

### setAavePool

```solidity
function setAavePool(address _token, address _aavePool) external
```

Sets the Aave V3 Pool for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |
| _aavePool | address | Aave V3 Pool address for this token |

### removeAavePool

```solidity
function removeAavePool(address _token) external
```

Removes the Aave V3 Pool for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |

### setAaveDepositsEnabled

```solidity
function setAaveDepositsEnabled(bool enabled) external
```

Updates `aaveDepositsEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether Aave auto-invest deposits are enabled |

### setAutoInvestFallbackEnabled

```solidity
function setAutoInvestFallbackEnabled(bool enabled) external
```

Updates `autoInvestFallbackEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether fallback to raw transfer is enabled on auto-invest failure |

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides instant deposit transfer hook to auto-invest into Aave_

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides request deposit transfer hook to auto-invest into Aave_

## DepositVaultWithMToken

Smart contract that handles mToken minting and invests
proceeds into another mToken's DepositVault

_If `mTokenDepositsEnabled` is false, regular deposit flow is used_

### mTokenDepositVault

```solidity
contract IDepositVault mTokenDepositVault
```

Target mToken DepositVault for auto-invest

### mTokenDepositsEnabled

```solidity
bool mTokenDepositsEnabled
```

Whether mToken auto-invest deposits are enabled

_if false, regular deposit flow will be used_

### autoInvestFallbackEnabled

```solidity
bool autoInvestFallbackEnabled
```

Whether to fall back to raw token transfer on auto-invest failure

_if false, the transaction will revert when auto-invest fails_

### SetMTokenDepositVault

```solidity
event SetMTokenDepositVault(address caller, address newVault)
```

Emitted when the mToken DepositVault address is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| newVault | address | new mToken DepositVault address |

### SetMTokenDepositsEnabled

```solidity
event SetMTokenDepositsEnabled(bool enabled)
```

Emitted when `mTokenDepositsEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether mToken deposits are enabled |

### SetAutoInvestFallbackEnabled

```solidity
event SetAutoInvestFallbackEnabled(bool enabled)
```

Emitted when `autoInvestFallbackEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether fallback to raw transfer is enabled |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, uint256 _minMTokenAmountForFirstDeposit, uint256 _maxSupplyCap, address _mTokenDepositVault) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _minMTokenAmountForFirstDeposit | uint256 | min amount for first deposit in mToken |
| _maxSupplyCap | uint256 | max supply cap for mToken |
| _mTokenDepositVault | address | target mToken DepositVault address |

### setMTokenDepositVault

```solidity
function setMTokenDepositVault(address _mTokenDepositVault) external
```

Sets the target mToken DepositVault address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mTokenDepositVault | address | new mToken DepositVault address |

### setMTokenDepositsEnabled

```solidity
function setMTokenDepositsEnabled(bool enabled) external
```

Updates `mTokenDepositsEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether mToken auto-invest deposits are enabled |

### setAutoInvestFallbackEnabled

```solidity
function setAutoInvestFallbackEnabled(bool enabled) external
```

Updates `autoInvestFallbackEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether fallback to raw transfer is enabled on auto-invest failure |

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides instant deposit transfer hook to auto-invest into target mToken DV_

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides request deposit transfer hook to auto-invest into target mToken DV_

## DepositVaultWithMorpho

Smart contract that handles mToken minting and invests
proceeds into Morpho Vaults

_If `morphoDepositsEnabled` is false, regular deposit flow is used_

### morphoVaults

```solidity
mapping(address => contract IMorphoVault) morphoVaults
```

mapping payment token to Morpho Vault

### morphoDepositsEnabled

```solidity
bool morphoDepositsEnabled
```

Whether Morpho auto-invest deposits are enabled

_if false, regular deposit flow will be used_

### autoInvestFallbackEnabled

```solidity
bool autoInvestFallbackEnabled
```

Whether to fall back to raw token transfer on auto-invest failure

_if false, the transaction will revert when auto-invest fails_

### SetMorphoVault

```solidity
event SetMorphoVault(address caller, address token, address vault)
```

Emitted when a Morpho Vault is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |
| vault | address | Morpho Vault address |

### RemoveMorphoVault

```solidity
event RemoveMorphoVault(address caller, address token)
```

Emitted when a Morpho Vault is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |

### SetMorphoDepositsEnabled

```solidity
event SetMorphoDepositsEnabled(bool enabled)
```

Emitted when `morphoDepositsEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether Morpho deposits are enabled |

### SetAutoInvestFallbackEnabled

```solidity
event SetAutoInvestFallbackEnabled(bool enabled)
```

Emitted when `autoInvestFallbackEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether fallback to raw transfer is enabled |

### setMorphoVault

```solidity
function setMorphoVault(address _token, address _morphoVault) external
```

Sets the Morpho Vault for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |
| _morphoVault | address | Morpho Vault (ERC-4626) address for this token |

### removeMorphoVault

```solidity
function removeMorphoVault(address _token) external
```

Removes the Morpho Vault for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |

### setMorphoDepositsEnabled

```solidity
function setMorphoDepositsEnabled(bool enabled) external
```

Updates `morphoDepositsEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether Morpho auto-invest deposits are enabled |

### setAutoInvestFallbackEnabled

```solidity
function setAutoInvestFallbackEnabled(bool enabled) external
```

Updates `autoInvestFallbackEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether fallback to raw transfer is enabled on auto-invest failure |

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides instant deposit transfer hook to auto-invest into Morpho_

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides request deposit transfer hook to auto-invest into Morpho_

## DepositVaultWithUSTB

Smart contract that handles mToken minting and invests
proceeds into USTB

### ustb

```solidity
address ustb
```

USTB token address

### ustbDepositsEnabled

```solidity
bool ustbDepositsEnabled
```

Whether USTB deposits are enabled

_if false, regular deposit flow will be used_

### SetUstbDepositsEnabled

```solidity
event SetUstbDepositsEnabled(bool enabled)
```

Emitted when `ustbDepositsEnabled` flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | Whether USTB deposits are enabled |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, uint256 _minMTokenAmountForFirstDeposit, uint256 _maxSupplyCap, address _ustb) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _minMTokenAmountForFirstDeposit | uint256 | min amount for first deposit in mToken |
| _maxSupplyCap | uint256 |  |
| _ustb | address | USTB token address |

### setUstbDepositsEnabled

```solidity
function setUstbDepositsEnabled(bool enabled) external
```

Updates `ustbDepositsEnabled` value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enabled | bool | whether USTB deposits are enabled |

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

_overrides original transfer to tokens receiver function
in case of USTB deposits are disabled or invest token is not supported
by USTB, it will act as the original transfer
otherwise it will take payment tokens from user, invest them into USTB
and will transfer USTB to tokens receiver_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | token address |
| amountToken | uint256 | amount of tokens to transfer in base18 |
| tokensDecimals | uint256 | decimals of tokens |

## ManageableVault

Contract with base Vault methods

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

### mToken

```solidity
contract IMToken mToken
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

### minInstantFee

```solidity
uint64 minInstantFee
```

minimum instant fee

### maxInstantFee

```solidity
uint64 maxInstantFee
```

maximum instant fee

### maxInstantShare

```solidity
uint64 maxInstantShare
```

maximum instant share value in basis points (100 = 1%)

### maxApproveRequestId

```solidity
uint256 maxApproveRequestId
```

max requestId that can be approved

### limitConfigs

```solidity
mapping(uint256 => struct LimitConfig) limitConfigs
```

mapping, window duration in seconds => limit config

### validateVaultAdminAccess

```solidity
modifier validateVaultAdminAccess()
```

_checks that msg.sender do have a vaultRole() role
and validates if function is not paused_

### validateUserAccess

```solidity
modifier validateUserAccess(address recipient)
```

_validate msg.sender and recipient access, validates if function is not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | recipient address |

### __ManageableVault_init

```solidity
function __ManageableVault_init(struct CommonVaultInitParams _commonVaultInitParams) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |

### __ManageableVault_initV2

```solidity
function __ManageableVault_initV2(struct CommonVaultV2InitParams _commonVaultV2InitParams) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |

### addPaymentToken

```solidity
function addPaymentToken(address token, address dataFeed, uint256 tokenFee, uint256 allowance, bool stable) external
```

adds a token to the stablecoins list.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| dataFeed | address | dataFeed address |
| tokenFee | uint256 |  |
| allowance | uint256 | token allowance (decimals 18) |
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
if type(uint256).max = infinite allowance
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

### setMinMaxInstantFee

```solidity
function setMinMaxInstantFee(uint64 newMinInstantFee, uint64 newMaxInstantFee) external
```

set new minimum/maximum instant fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinInstantFee | uint64 | new minimum instant fee |
| newMaxInstantFee | uint64 | new maximum instant fee |

### setMaxInstantShare

```solidity
function setMaxInstantShare(uint64 newMaxInstantShare) external
```

set maximum instant share value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxInstantShare | uint64 | new maximum instant share value in basis points (100 = 1%) |

### setMaxApproveRequestId

```solidity
function setMaxApproveRequestId(uint256 newMaxApproveRequestId) external
```

sets max requestId that can be approved

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxApproveRequestId | uint256 | new max requestId that can be approved |

### setInstantLimitConfig

```solidity
function setInstantLimitConfig(uint256 window, uint256 limit) external
```

set operation limit configs.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| limit | uint256 | limit amount per window |

### removeInstantLimitConfig

```solidity
function removeInstantLimitConfig(uint256 window) external
```

remove operation limit config.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

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

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount) external
```

withdraws `amount` of a given `token` from the contract
to the `tokensReceiver` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |

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

### getLimitConfigs

```solidity
function getLimitConfigs() external view returns (uint256[] windows, struct LimitConfig[] configs)
```

returns array of limit configs

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| windows | uint256[] | array of limit config windows |
| configs | struct LimitConfig[] | array of limit configs |

### vaultRole

```solidity
function vaultRole() public view virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _tokenTransferFromUser

```solidity
function _tokenTransferFromUser(address token, address to, uint256 amount, uint256 tokenDecimals) internal returns (uint256 transferAmount)
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

### _tokenTransferFromTo

```solidity
function _tokenTransferFromTo(address token, address from, address to, uint256 amount, uint256 tokenDecimals) internal returns (uint256 transferAmount)
```

_do safeTransfer or safeTransferFrom on a given token
and converts `amount` from base18
to amount with a correct precision._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token |
| from | address | address. If its address(this) the safeTransfer will be used instead of safeTransferFrom |
| to | address | address |
| amount | uint256 | amount of `token` to transfer from `user` |
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
function _getFeeAmount(uint256 feePercent, uint256 amount) internal view returns (uint256)
```

_returns calculated fee amount depends on the provided fee percent and amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feePercent | uint256 | fee percent |
| amount | uint256 | amount of token (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | feeAmount calculated fee amount |

### _getFee

```solidity
function _getFee(address sender, address token, bool isInstant) internal view returns (uint256 feePercent)
```

_returns calculated fee percent depends on parameters_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | sender address |
| token | address | token address |
| isInstant | bool | is instant operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| feePercent | uint256 | calculated fee percent |

### _validateInstantFee

```solidity
function _validateInstantFee() internal view
```

_validates instant fee is within the range of min/max instant fee_

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
function _validateUserAccess(address user, bool validatePaused) internal view
```

_validate user access_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| validatePaused | bool | if true, validates if function is not paused |

### _validateUserAccess

```solidity
function _validateUserAccess(address user, address recipient) internal view
```

_validate user access and validates if function is not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| recipient | address | recipient address |

### _validatePauseAdminAccess

```solidity
function _validatePauseAdminAccess(address account) internal view
```

_validates that the caller has access to pause functions_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account address |

### _validateGreenlistableAdminAccess

```solidity
function _validateGreenlistableAdminAccess(address account) internal view
```

_checks that a given `account` has access to greenlistable functions_

### _validateSanctionListAdminAccess

```solidity
function _validateSanctionListAdminAccess(address account) internal view
```

_validates that the caller has access to sanctions list functions_

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

### _getMTokenRate

```solidity
function _getMTokenRate() internal view returns (uint256 mTokenRate)
```

_gets and validates mToken rate_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mTokenRate | uint256 | mToken rate |

### _getPTokenRate

```solidity
function _getPTokenRate(address token) internal view returns (uint256 tokenRate)
```

_gets and validates pToken rate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of pToken |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenRate | uint256 | token rate |

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

### _validateSanctionListAdminAccess

```solidity
function _validateSanctionListAdminAccess(address account) internal view virtual
```

_validates that the caller has access to sanctions list functions_

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

### _validateGreenlistableAdminAccess

```solidity
function _validateGreenlistableAdminAccess(address account) internal view virtual
```

_checks that a given `account` has access to greenlistable functions_

## MidasAccessControl

Smart contract that stores all roles for Midas project

### functionAccessAdminRoleEnabled

```solidity
mapping(bytes32 => bool) functionAccessAdminRoleEnabled
```

_Only when true may holders of `functionAccessAdminRole` manage grant operators for that role's scopes._

### initialize

```solidity
function initialize() external
```

upgradeable pattern contract`s initializer

### setFunctionAccessAdminRoleEnabledMult

```solidity
function setFunctionAccessAdminRoleEnabledMult(struct IMidasAccessControl.SetFunctionAccessAdminRoleEnabledParams[] params) external
```

Enable or disable which OZ role may administer function-access scopes for that role.

_Only `DEFAULT_ADMIN_ROLE` can call this function.
Prevents unrelated role admins from spamming access mappings._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionAccessAdminRoleEnabledParams[] | array of SetFunctionAccessAdminRoleEnabledParams |

### setFunctionAccessGrantOperatorMult

```solidity
function setFunctionAccessGrantOperatorMult(struct IMidasAccessControl.SetFunctionAccessGrantOperatorParams[] params) external
```

Add or remove a grant operator for a specific contract function scope.

_Caller must hold `functionAccessAdminRole`; role must be enabled via `setFunctionAccessAdminRoleEnabled`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionAccessGrantOperatorParams[] | array of SetFunctionAccessGrantOperatorParams |

### setFunctionPermissionMult

```solidity
function setFunctionPermissionMult(struct IMidasAccessControl.SetFunctionPermissionParams[] params) external
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionPermissionParams[] | array of SetFunctionPermissionParams |

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

### setRoleAdmin

```solidity
function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external
```

set the admin role for a specific role

_can be called only by the address that holds `DEFAULT_ADMIN_ROLE`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | the role to set the admin role for |
| newAdminRole | bytes32 | the new admin role |

### renounceRole

```solidity
function renounceRole(bytes32, address) public pure
```

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 functionAccessAdminRole, address targetContract, bytes4 functionSelector, address operator) external view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 functionAccessAdminRole, address targetContract, bytes4 functionSelector, address account) external view returns (bool)
```

Whether `account` may call the scoped function on `targetContract`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| account | address | address checked for permissio. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

## MidasAccessControlRoles

Base contract that stores all roles descriptors

### GREENLIST_OPERATOR_ROLE

```solidity
bytes32 GREENLIST_OPERATOR_ROLE
```

actor that can change green list statuses of addresses

_keccak256("GREENLIST_OPERATOR_ROLE")_

### BLACKLIST_OPERATOR_ROLE

```solidity
bytes32 BLACKLIST_OPERATOR_ROLE
```

actor that can change black list statuses of addresses

_keccak256("BLACKLIST_OPERATOR_ROLE")_

### GREENLISTED_ROLE

```solidity
bytes32 GREENLISTED_ROLE
```

actor that is greenlisted

_keccak256("GREENLISTED_ROLE")_

### BLACKLISTED_ROLE

```solidity
bytes32 BLACKLISTED_ROLE
```

actor that is blacklisted

_keccak256("BLACKLISTED_ROLE")_

## Pausable

Base contract that implements basic functions and modifiers
with pause functionality

### fnPaused

```solidity
mapping(bytes4 => bool) fnPaused
```

function id => paused status

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

### onlyPauseAdmin

```solidity
modifier onlyPauseAdmin()
```

_checks that a given `account` has access to pause functions_

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

### _validatePauseAdminAccess

```solidity
function _validatePauseAdminAccess(address account) internal view virtual
```

_validates that the caller has access to pause functions_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account address |

### _requireFnNotPaused

```solidity
function _requireFnNotPaused(bytes4 fn, bool validateGlobalPause) internal view
```

_checks that a given `fn` is not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fn | bytes4 | function id |
| validateGlobalPause | bool | if true, validates if global pause is not paused |

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

### _hasFunctionPermission

```solidity
function _hasFunctionPermission(bytes32 functionAccessAdminRole, bytes4 functionSelector, address account) internal view
```

_checks that given `account` has function permission for the given function selector_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| functionSelector | bytes4 | function selector |
| account | address | address checked for permission |

## IDataFeed

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

## Request

Legacy Mint request scruct

_used for backward compatibility_

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

## RequestV2

Mint request scruct

_replaces `Request` struct and adds next fields:
- `depositedInstantUsdAmount`
- `approvedMTokenRate`
- `version`_

```solidity
struct RequestV2 {
  address sender;
  address tokenIn;
  enum RequestStatus status;
  uint256 depositedUsdAmount;
  uint256 usdAmountWithoutFees;
  uint256 tokenOutRate;
  uint256 depositedInstantUsdAmount;
  uint256 approvedTokenOutRate;
  uint8 version;
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

### SetMaxSupplyCap

```solidity
event SetMaxSupplyCap(address caller, uint256 newValue)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newValue | uint256 | new max supply cap value |

### DepositInstantV2

```solidity
event DepositInstantV2(address user, address tokenIn, address recipient, uint256 amountUsd, uint256 amountToken, uint256 fee, uint256 minted, bytes32 referrerId)
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

### DepositRequestV2

```solidity
event DepositRequestV2(uint256 requestId, address user, address tokenIn, address recipient, uint256 amountToken, uint256 amountUsd, uint256 fee, uint256 tokenOutRate, bytes32 referrerId)
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

### ApproveRequestV2

```solidity
event ApproveRequestV2(uint256 requestId, uint256 newOutRate, bool isSafe, bool isAvgRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newOutRate | uint256 | mToken rate inputted by admin |
| isSafe | bool | if true, approval is safe |
| isAvgRate | bool | if true, newOutRate is avg rate |

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

Does the same as original `depositInstant` but allows specifying a custom tokensReceiver address.

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

Does the same as original `depositRequest` but allows specifying a custom tokensReceiver address.

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

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256)
```

Instantly deposits `instantShare` amount of `amountMTokenIn` and creates a request for the remaining amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| referrerId | bytes32 | referrer id |
| recipientRequest | address | address that receives the mTokens for the request part |
| instantShare | uint256 | % amount of `amountToken` that will be deposited instantly |
| minReceiveAmountInstantShare | uint256 | min receive amount for the instant share |
| recipientInstant | address | address that receives the mTokens for the instant part |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the mToken rate from the request.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the current mToken rate.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the current mToken rate.
Does same validation as `safeApproveRequestAvgRate`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds, uint256 newOutRate) external
```

approving requests from the `requestIds` array using the `newOutRate`.
Does same validation as `safeApproveRequest`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| newOutRate | uint256 | new mToken rate inputted by vault admin |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds, uint256 avgMTokenRate) external
```

approving requests from the `requestIds` array using the `newOutRate`.
Does same validation as `safeApproveRequestAvgRate`.
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### safeApproveRequest

```solidity
function safeApproveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request if inputted token rate fit price deviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### safeApproveRequestAvgRate

```solidity
function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request if inputted token rate fit price deviation percent
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |

### approveRequestAvgRate

```solidity
function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### setMaxSupplyCap

```solidity
function setMaxSupplyCap(uint256 newValue) external
```

sets new max supply cap value
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max supply cap value |

## IMToken

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mToken token `amount` to a given `to` address.
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

burns mToken token `amount` to a given `to` address.
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

puts mToken token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mToken token on pause.
should be called only from permissioned actor

## TokenConfig

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct TokenConfig {
  address dataFeed;
  uint256 fee;
  uint256 allowance;
  bool stable;
}
```

## LimitConfig

Rate limit configuration

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct LimitConfig {
  uint256 limit;
  uint256 limitUsed;
  uint256 lastEpoch;
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

## CommonVaultInitParams

```solidity
struct CommonVaultInitParams {
  address ac;
  address sanctionsList;
  uint256 variationTolerance;
  uint256 minAmount;
  address mToken;
  address mTokenDataFeed;
  address tokensReceiver;
  address feeReceiver;
  uint256 instantFee;
}
```

## LimitConfigInitParams

```solidity
struct LimitConfigInitParams {
  uint256 window;
  uint256 limit;
}
```

## CommonVaultV2InitParams

```solidity
struct CommonVaultV2InitParams {
  uint64 minInstantFee;
  uint64 maxInstantFee;
  uint64 maxInstantShare;
  struct LimitConfigInitParams[] limitConfigs;
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
event AddPaymentToken(address caller, address token, address dataFeed, uint256 fee, uint256 allowance, bool stable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| token | address | address of token that |
| dataFeed | address | token dataFeed address |
| fee | uint256 | fee 1% = 100 |
| allowance | uint256 | token allowance (decimals 18) |
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

### SetMinMaxInstantFee

```solidity
event SetMinMaxInstantFee(address caller, uint64 newMinInstantFee, uint64 newMaxInstantFee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newMinInstantFee | uint64 | new minimum instant fee |
| newMaxInstantFee | uint64 | new maximum instant fee |

### SetMinAmount

```solidity
event SetMinAmount(address caller, uint256 newAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newAmount | uint256 | new min amount for operation |

### SetInstantLimitConfig

```solidity
event SetInstantLimitConfig(address caller, uint256 window, uint256 limit)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| window | uint256 | window duration in seconds |
| limit | uint256 | limit amount per window |

### SetMaxInstantShare

```solidity
event SetMaxInstantShare(address caller, uint64 newMaxInstantShare)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newMaxInstantShare | uint64 | new maximum instant share value in basis points (100 = 1%) |

### RemoveInstantLimitConfig

```solidity
event RemoveInstantLimitConfig(address caller, uint256 window)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| window | uint256 | window duration in seconds |

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

### SetMaxApproveRequestId

```solidity
event SetMaxApproveRequestId(address caller, uint256 newMaxApproveRequestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newMaxApproveRequestId | uint256 | new max requestId that can be approved |

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
function mToken() external view returns (contract IMToken)
```

The mToken contract address.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IMToken | The address of the mToken contract. |

### addPaymentToken

```solidity
function addPaymentToken(address token, address dataFeed, uint256 fee, uint256 allowance, bool stable) external
```

adds a token to the stablecoins list.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| dataFeed | address | dataFeed address |
| fee | uint256 | 1% = 100 |
| allowance | uint256 | token allowance (decimals 18) |
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
if type(uint256).max = infinite allowance
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

### setMinMaxInstantFee

```solidity
function setMinMaxInstantFee(uint64 newMinInstantFee, uint64 newMaxInstantFee) external
```

set new minimum/maximum instant fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinInstantFee | uint64 | new minimum instant fee |
| newMaxInstantFee | uint64 | new maximum instant fee |

### setInstantLimitConfig

```solidity
function setInstantLimitConfig(uint256 window, uint256 limit) external
```

set operation limit configs.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| limit | uint256 | limit amount per window |

### setMaxInstantShare

```solidity
function setMaxInstantShare(uint64 newMaxInstantShare) external
```

set maximum instant share value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxInstantShare | uint64 | new maximum instant share value in basis points (100 = 1%) |

### setMaxApproveRequestId

```solidity
function setMaxApproveRequestId(uint256 newMaxApproveRequestId) external
```

sets max requestId that can be approved

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxApproveRequestId | uint256 | new max requestId that can be approved |

### removeInstantLimitConfig

```solidity
function removeInstantLimitConfig(uint256 window) external
```

remove operation limit config.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

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

### withdrawToken

```solidity
function withdrawToken(address token, uint256 amount) external
```

withdraws `amount` of a given `token` from the contract
to the `tokensReceiver` address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |
| amount | uint256 | token amount |

## IMidasAccessControl

### SetFunctionAccessAdminRoleEnabledParams

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SetFunctionAccessAdminRoleEnabledParams {
  bytes32 functionAccessAdminRole;
  bool enabled;
}
```

### SetFunctionAccessGrantOperatorParams

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SetFunctionAccessGrantOperatorParams {
  bytes32 functionAccessAdminRole;
  address targetContract;
  bytes4 functionSelector;
  address operator;
  bool enabled;
}
```

### SetFunctionPermissionParams

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct SetFunctionPermissionParams {
  bytes32 functionAccessAdminRole;
  address targetContract;
  bytes4 functionSelector;
  address account;
  bool enabled;
}
```

### FunctionAccessAdminRoleEnable

```solidity
event FunctionAccessAdminRoleEnable(bytes32 functionAccessAdminRole, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| enabled | bool | whether that role may manage grant operators for the scope. |

### FunctionAccessGrantOperatorUpdate

```solidity
event FunctionAccessGrantOperatorUpdate(bytes32 functionAccessAdminRole, address targetContract, bytes4 functionSelector, address operator, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | contract whose function is scoped. |
| functionSelector | bytes4 | selector of the scoped function. |
| operator | address | address that may call `setFunctionPermission` for this scope. |
| enabled | bool | grant or revoke grant-operator status. |

### FunctionPermissionUpdate

```solidity
event FunctionPermissionUpdate(bytes32 functionAccessAdminRole, address targetContract, address account, bytes4 functionSelector, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | contract whose function is scoped. |
| account | address | address receiving or losing permission |
| functionSelector | bytes4 | selector of the scoped function. |
| enabled | bool | grant or revoke |

### setFunctionAccessAdminRoleEnabledMult

```solidity
function setFunctionAccessAdminRoleEnabledMult(struct IMidasAccessControl.SetFunctionAccessAdminRoleEnabledParams[] params) external
```

Enable or disable which OZ role may administer function-access scopes for that role.

_Only `DEFAULT_ADMIN_ROLE` can call this function.
Prevents unrelated role admins from spamming access mappings._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionAccessAdminRoleEnabledParams[] | array of SetFunctionAccessAdminRoleEnabledParams |

### setFunctionAccessGrantOperatorMult

```solidity
function setFunctionAccessGrantOperatorMult(struct IMidasAccessControl.SetFunctionAccessGrantOperatorParams[] params) external
```

Add or remove a grant operator for a specific contract function scope.

_Caller must hold `functionAccessAdminRole`; role must be enabled via `setFunctionAccessAdminRoleEnabled`._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionAccessGrantOperatorParams[] | array of SetFunctionAccessGrantOperatorParams |

### setFunctionPermissionMult

```solidity
function setFunctionPermissionMult(struct IMidasAccessControl.SetFunctionPermissionParams[] params) external
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetFunctionPermissionParams[] | array of SetFunctionPermissionParams |

### setRoleAdmin

```solidity
function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external
```

set the admin role for a specific role

_can be called only by the address that holds `DEFAULT_ADMIN_ROLE`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | the role to set the admin role for |
| newAdminRole | bytes32 | the new admin role |

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 functionAccessAdminRole, address targetContract, bytes4 functionSelector, address operator) external view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 functionAccessAdminRole, address targetContract, bytes4 functionSelector, address account) external view returns (bool)
```

Whether `account` may call the scoped function on `targetContract`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionAccessAdminRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| account | address | address checked for permissio. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

## Request

Legacy Redeem request scruct

_used for backward compatibility_

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

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

## RequestV2

Redeem request v2 scruct

_replaces `Request` struct and adds `feePercent`, `amountMTokenInstant`, `approvedMTokenRate` and `version` fields_

### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct RequestV2 {
  address sender;
  address tokenOut;
  enum RequestStatus status;
  uint256 amountMToken;
  uint256 mTokenRate;
  uint256 tokenOutRate;
  uint256 feePercent;
  uint256 amountMTokenInstant;
  uint256 approvedMTokenRate;
  uint8 version;
}
```

## RedemptionVaultInitParams

```solidity
struct RedemptionVaultInitParams {
  address requestRedeemer;
}
```

## RedemptionVaultV2InitParams

```solidity
struct RedemptionVaultV2InitParams {
  address loanLp;
  address loanLpFeeReceiver;
  address loanRepaymentAddress;
  address loanSwapperVault;
  uint64 maxLoanApr;
}
```

## LiquidityProviderLoanRequest

```solidity
struct LiquidityProviderLoanRequest {
  address tokenOut;
  uint256 amountTokenOut;
  uint256 amountFee;
  uint256 createdAt;
  enum RequestStatus status;
}
```

## IRedemptionVault

### RedeemInstantV2

```solidity
event RedeemInstantV2(address user, address tokenOut, address recipient, uint256 amount, uint256 feeAmount, uint256 amountTokenOut)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address |  |
| amount | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in tokenOut |
| amountTokenOut | uint256 | amount of tokenOut |

### RedeemRequestV2

```solidity
event RedeemRequestV2(uint256 requestId, address user, address tokenOut, address recipient, uint256 amountMTokenIn, uint256 amountMTokenInstant, uint256 mTokenRate, uint256 feePercent)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address | recipient address |
| amountMTokenIn | uint256 | amount of mToken |
| amountMTokenInstant | uint256 | amount of mToken that was redeemed instantly |
| mTokenRate | uint256 | mToken rate |
| feePercent | uint256 | fee percent |

### CreateLiquidityProviderLoanRequest

```solidity
event CreateLiquidityProviderLoanRequest(uint256 loanId, address tokenOut, uint256 amountTokenOut, uint256 amountFee, uint256 mTokenRate, uint256 tokenOutRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | loan id |
| tokenOut | address | tokenOut address |
| amountTokenOut | uint256 | amount of tokenOut |
| amountFee | uint256 | fee amount in payment token |
| mTokenRate | uint256 | mToken rate |
| tokenOutRate | uint256 | tokenOut rate |

### ApproveRequestV2

```solidity
event ApproveRequestV2(uint256 requestId, uint256 newMTokenRate, bool isSafe, bool isAvgRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newMTokenRate | uint256 | new mToken rate |
| isSafe | bool | if true, approval is safe |
| isAvgRate | bool | if true, newMtokenRate is avg rate |

### RejectRequest

```solidity
event RejectRequest(uint256 requestId, address user)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | address of user |

### SetRequestRedeemer

```solidity
event SetRequestRedeemer(address caller, address redeemer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| redeemer | address | new address of request redeemer |

### SetLoanLpFeeReceiver

```solidity
event SetLoanLpFeeReceiver(address caller, address newLoanLpFeeReceiver)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLoanLpFeeReceiver | address | new address of loan liquidity provider fee receiver |

### SetLoanLp

```solidity
event SetLoanLp(address caller, address newLoanLp)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLoanLp | address | new address of loan liquidity provider |

### SetLoanRepaymentAddress

```solidity
event SetLoanRepaymentAddress(address caller, address newLoanRepaymentAddress)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLoanRepaymentAddress | address | new address of loan repayment address |

### SetLoanSwapperVault

```solidity
event SetLoanSwapperVault(address caller, address newLoanSwapperVault)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLoanSwapperVault | address | new address of loan swapper vault |

### SetMaxLoanApr

```solidity
event SetMaxLoanApr(address caller, uint64 newMaxLoanApr)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newMaxLoanApr | uint64 | new maximum loan APR value in basis points (100 = 1%) |

### SetPreferLoanLiquidity

```solidity
event SetPreferLoanLiquidity(address caller, bool newLoanLpFirst)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| newLoanLpFirst | bool | new flag to determine if the loan LP liquidity should be used first |

### RepayLpLoanRequest

```solidity
event RepayLpLoanRequest(address caller, uint256 requestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| requestId | uint256 | request id |

### CancelLpLoanRequest

```solidity
event CancelLpLoanRequest(address caller, uint256 requestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | function caller (msg.sender) |
| requestId | uint256 | request id |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mToken from the user.
Transfers fee in mToken to feeReceiver
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external
```

Does the same as original `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request
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

Does the same as original `redeemRequest` but allows specifying a custom tokensReceiver address.

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

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256)
```

Instantly redeems `instantShare` amount of `amountMTokenIn` and creates a request for the remaining amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| recipientRequest | address | address that receives tokens for the request part |
| instantShare | uint256 | % amount of `amountMTokenIn` that will be redeemed instantly |
| minReceiveAmountInstantShare | uint256 | min receive amount for the instant share |
| recipientInstant | address | address that receives tokens for the instant part |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the mToken rate
from the request. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the
current mToken rate. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the
current mToken rate as avg rate. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequestAvgRate`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds, uint256 newMTokenRate) external
```

approving requests from the `requestIds` array using the `newMTokenRate`.
WONT fail even if there is not enough liquidity to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| newMTokenRate | uint256 | new mToken rate inputted by vault admin |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds, uint256 avgMTokenRate) external
```

approving requests from the `requestIds` array using the `avgMTokenRate`.
WONT fail even if there is not enough liquidity to process all requests.
Does same validation as `safeApproveRequestAvgRate`.
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### approveRequestAvgRate

```solidity
function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving redeem request if not exceed tokenOut allowance
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### safeApproveRequestAvgRate

```solidity
function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request if inputted token rate fit price diviation percent
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### bulkRepayLpLoanRequest

```solidity
function bulkRepayLpLoanRequest(uint256[] requestIds, uint64 loanApr) external
```

repaying loan requests from the `requestIds` array
Transfers tokenOut to loan repayment address
Transfers fee in tokenOut to loan lp fee receiver
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| loanApr | uint64 | loan APR. Overrides calculated loan fee in case if accrued interest is greater than the calculated loan fee. |

### cancelLpLoanRequest

```solidity
function cancelLpLoanRequest(uint256 requestId) external
```

canceling loan request
Sets request flags to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setRequestRedeemer

```solidity
function setRequestRedeemer(address redeemer) external
```

set address which is designated for standard redemptions, allowing tokens to be pulled from this address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| redeemer | address | new address of request redeemer |

### setLoanLpFeeReceiver

```solidity
function setLoanLpFeeReceiver(address newLoanLpFeeReceiver) external
```

set address of loan liquidity provider fee receiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFeeReceiver | address | new address of loan liquidity provider fee receiver |

### setLoanLp

```solidity
function setLoanLp(address newLoanLp) external
```

set address of loan liquidity provider

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLp | address | new address of loan liquidity provider |

### setLoanRepaymentAddress

```solidity
function setLoanRepaymentAddress(address newLoanRepaymentAddress) external
```

set address of loan repayment address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanRepaymentAddress | address | new address of loan repayment address |

### setLoanSwapperVault

```solidity
function setLoanSwapperVault(address newLoanSwapperVault) external
```

set address of loan swapper vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanSwapperVault | address | new address of loan swapper vault |

### setMaxLoanApr

```solidity
function setMaxLoanApr(uint64 newMaxLoanApr) external
```

set maximum loan APR value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxLoanApr | uint64 | new maximum loan APR value in basis points (100 = 1%) |

### setPreferLoanLiquidity

```solidity
function setPreferLoanLiquidity(bool newLoanLpFirst) external
```

set flag to determine if the loan LP liquidity should be used first

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFirst | bool | new flag to determine if the loan LP liquidity should be used first |

## ISanctionsList

### isSanctioned

```solidity
function isSanctioned(address addr) external view returns (bool)
```

## IAaveV3Pool

Minimal interface for the Aave V3 Pool (v3.2+)

_Full interface: https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/interfaces/IPool.sol_

### withdraw

```solidity
function withdraw(address asset, uint256 amount, address to) external returns (uint256)
```

Withdraws an `amount` of underlying asset from the reserve, burning the equivalent aTokens owned
E.g. User has 100 aUSDC, calls withdraw() and receives 100 USDC, burning the 100 aUSDC

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The address of the underlying asset to withdraw |
| amount | uint256 | The underlying amount to be withdrawn   - Send the value type(uint256).max in order to withdraw the whole aToken balance |
| to | address | The address that will receive the underlying, same as msg.sender if the user   wants to receive it on his own wallet, or a different address if the beneficiary is a   different wallet |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The final amount withdrawn |

### supply

```solidity
function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external
```

Supplies an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
- E.g. User supplies 100 USDC and gets in return 100 aUSDC

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The address of the underlying asset to supply |
| amount | uint256 | The amount to be supplied |
| onBehalfOf | address | The address that will receive the aTokens, same as msg.sender if the user   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens   is a different wallet |
| referralCode | uint16 | Code used to register the integrator originating the operation, for potential rewards.   0 if the action is executed directly by the user, without any middle-man |

### getReserveAToken

```solidity
function getReserveAToken(address asset) external view returns (address)
```

Returns the aToken address of a reserve

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | address | The address of the underlying asset of the reserve |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The aToken address of the reserve |

## IAcreAdapter

Interface for the Vault contract.

_This interface is used to interact with the Vault contract.
     It is used to deposit and redeem shares.
     It is used to get the price of the shares with convertToShares and convertToAssets.
     It is used to request an asynchronous redemption of shares.
     It assumes no fees are charged on deposits or redemptions._

### Deposit

```solidity
event Deposit(address sender, address owner, uint256 assets, uint256 shares)
```

Emitted when assets are deposited into the vault.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | The address that deposited the assets. |
| owner | address | The address that received the shares. |
| assets | uint256 | The amount of assets deposited. |
| shares | uint256 | The amount of shares received. |

### RedeemRequest

```solidity
event RedeemRequest(uint256 requestId, address sender, address receiver, uint256 shares)
```

Emitted when a redeem request is made.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | The request ID. |
| sender | address | The address that made the request. |
| receiver | address | The address that will received the assets. |
| shares | uint256 | The amount of shares that would be redeemed. |

### share

```solidity
function share() external view returns (address shareTokenAddress)
```

_Returns the address of the share token. The address MAY be the same
     as the vault address.

- MUST be an ERC-20 token contract.
- MUST NOT revert._

### asset

```solidity
function asset() external view returns (address assetTokenAddress)
```

_Returns the address of the asset token.

- MUST be an ERC-20 token contract.
- MUST NOT revert._

### convertToShares

```solidity
function convertToShares(uint256 assets) external view returns (uint256 shares)
```

_Returns the amount of shares that the Vault would exchange for the amount of assets provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from._

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external view returns (uint256 assets)
```

_Returns the amount of assets that the Vault would exchange for the amount of shares provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from._

### deposit

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
```

_Mints shares Vault shares to owner by depositing exactly amount of underlying tokens.

- MUST emit the Deposit event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of assets to be deposited. |
| receiver | address | The address that will received the shares. NOTE: Implementation requires pre-approval of the Vault with the Vault’s underlying asset token. |

### requestRedeem

```solidity
function requestRedeem(uint256 shares, address receiver) external returns (uint256 requestId)
```

_Assumes control of shares from sender into the Vault and submits a Request for asynchronous redeem.

- MUST emit the RedeemRequest event.
- Once a request is finalized MUST emit the RedeemFinalize event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | The amount of shares to be redeemed. |
| receiver | address | The address that will receive assets on request finalization. NOTE: Implementations requires pre-approval of the Vault with the Vault's share token. |

## IMorphoVault

Morpho Vault interface extending the ERC-4626 Tokenized Vault Standard

_Works with both Morpho Vaults V1 (MetaMorpho) and V2
V1 repo: https://github.com/morpho-org/metamorpho-v1.1
V2 repo: https://github.com/morpho-org/vault-v2_

## ISuperstateToken

### StablecoinConfig

```solidity
struct StablecoinConfig {
  address sweepDestination;
  uint96 fee;
}
```

### subscribe

```solidity
function subscribe(address to, uint256 inAmount, address stablecoin) external
```

### setStablecoinConfig

```solidity
function setStablecoinConfig(address stablecoin, address newSweepDestination, uint96 newFee) external
```

### supportedStablecoins

```solidity
function supportedStablecoins(address stablecoin) external view returns (struct ISuperstateToken.StablecoinConfig)
```

### symbol

```solidity
function symbol() external view returns (string)
```

### owner

```solidity
function owner() external view returns (address)
```

### allowListV2

```solidity
function allowListV2() external view returns (address)
```

### isAllowed

```solidity
function isAllowed(address addr) external view returns (bool)
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

## AcreAdapter

Wrapper for Midas Vaults to be used by Acre protocol

### depositVault

```solidity
address depositVault
```

### redemptionVault

```solidity
address redemptionVault
```

### mTokenDataFeed

```solidity
address mTokenDataFeed
```

### assetTokenDecimals

```solidity
uint256 assetTokenDecimals
```

### constructor

```solidity
constructor(address depositVault_, address redemptionVault_, address assetToken_) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| depositVault_ | address | address of deposit vault contract (IDepositVault) |
| redemptionVault_ | address | address of redemption vault contract (IRedemptionVault) |
| assetToken_ | address | address of ERC20 asset token contract |

### deposit

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
```

_Mints shares Vault shares to owner by depositing exactly amount of underlying tokens.

- MUST emit the Deposit event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | The amount of assets to be deposited. |
| receiver | address | The address that will received the shares. NOTE: Implementation requires pre-approval of the Vault with the Vault’s underlying asset token. |

### requestRedeem

```solidity
function requestRedeem(uint256 shares, address receiver) external returns (uint256 requestId)
```

_Assumes control of shares from sender into the Vault and submits a Request for asynchronous redeem.

- MUST emit the RedeemRequest event.
- Once a request is finalized MUST emit the RedeemFinalize event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | The amount of shares to be redeemed. |
| receiver | address | The address that will receive assets on request finalization. NOTE: Implementations requires pre-approval of the Vault with the Vault's share token. |

### convertToShares

```solidity
function convertToShares(uint256 assets) external view returns (uint256)
```

_Returns the amount of shares that the Vault would exchange for the amount of assets provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from._

### convertToAssets

```solidity
function convertToAssets(uint256 shares) external view returns (uint256)
```

_Returns the amount of assets that the Vault would exchange for the amount of shares provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from._

### share

```solidity
function share() public view returns (address)
```

_Returns the address of the share token. The address MAY be the same
     as the vault address.

- MUST be an ERC-20 token contract.
- MUST NOT revert._

### asset

```solidity
function asset() public view returns (address)
```

_Returns the address of the asset token.

- MUST be an ERC-20 token contract.
- MUST NOT revert._

## MidasAxelarVaultExecutable

This contract is a InterchainTokenExecutable contract that allows deposits and redemptions operations against a
        synchronous vault across different chains using Axelar's ITS protocol.

_The contract is designed to handle deposits and redemptions of vault mTokens and paymentTokens,
     ensuring that the mToken and paymentToken are correctly managed and transferred across chains.
     It also includes slippage protection and refund mechanisms for failed transactions._

### TokenAddressMismatch

```solidity
error TokenAddressMismatch(address itsTokenValue, address dvValue, address rvValue)
```

error for token address mismatch

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| itsTokenValue | address | address of ITS token |
| dvValue | address | address of mToken of deposit vault |
| rvValue | address | address of mToken of redemption vault |

### depositVault

```solidity
contract IDepositVault depositVault
```

getter for the deposit vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### redemptionVault

```solidity
contract IRedemptionVault redemptionVault
```

getter for the redemption vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenId

```solidity
bytes32 paymentTokenId
```

getter for the paymentToken ITS id

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenErc20

```solidity
address paymentTokenErc20
```

getter for the paymentToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### mTokenId

```solidity
bytes32 mTokenId
```

getter for the mToken ITS id

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### mTokenErc20

```solidity
address mTokenErc20
```

getter for the mToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenDecimals

```solidity
uint8 paymentTokenDecimals
```

decimals of `paymentTokenErc20`

### chainNameHash

```solidity
bytes32 chainNameHash
```

hash of the current chain name

### constructor

```solidity
constructor(address _depositVault, address _redemptionVault, bytes32 _paymentTokenId, bytes32 _mTokenId, address _interchainTokenService) public
```

### initialize

```solidity
function initialize() external
```

Initializes the contract

### _executeWithInterchainToken

```solidity
function _executeWithInterchainToken(bytes32 commandId, string sourceChain, bytes sourceAddress, bytes data, bytes32 tokenId, address, uint256 amount) internal
```

internal function to execute the interchain token transfer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| commandId | bytes32 | the commandId of the operation |
| sourceChain | string | the source chain of the operation |
| sourceAddress | bytes | the source address of the operation |
| data | bytes | the data of the operation |
| tokenId | bytes32 | the ITS tokenId of the operation |
|  | address |  |
| amount | uint256 | the amount of the operation |

### handleExecuteWithInterchainToken

```solidity
function handleExecuteWithInterchainToken(bytes _sourceAddress, bytes _data, bytes32 _tokenId, uint256 _amount) external
```

internal function to execute the interchain token transfer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sourceAddress | bytes | the source address of the operation |
| _data | bytes | the data of the operation |
| _tokenId | bytes32 | the ITS tokenId of the operation |
| _amount | uint256 | the amount of the operation |

### depositAndSend

```solidity
function depositAndSend(uint256 _paymentTokenAmount, bytes _data) external payable
```

deposits and sends the paymentToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentTokenAmount | uint256 | the amount of payment tokens to deposit |
| _data | bytes | encoded data for the deposit. Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,bytes32 referrerId,string receiverChainName); |

### redeemAndSend

```solidity
function redeemAndSend(uint256 _mTokenAmount, bytes _data) external payable
```

redeems and sends the mToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mTokenAmount | uint256 | the amount of m tokens to redeem |
| _data | bytes | encoded data for the redemption Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,string receiverChainName); |

### _depositAndSend

```solidity
function _depositAndSend(bytes _depositor, uint256 _paymentTokenAmount, bytes _data) internal
```

internal function to deposit and send the paymentToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _depositor | bytes | the depositor of the operation |
| _paymentTokenAmount | uint256 | the amount of payment tokens to deposit |
| _data | bytes | the data of the operation |

### _redeemAndSend

```solidity
function _redeemAndSend(bytes _redeemer, uint256 _mTokenAmount, bytes _data) internal
```

internal function to redeem and send the mToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _redeemer | bytes | the address of the redeemer |
| _mTokenAmount | uint256 | the amount of mTokens to redeem |
| _data | bytes | the data of the operation |

### _deposit

```solidity
function _deposit(address _receiver, uint256 _paymentTokenAmount, uint256 _minReceiveAmount, bytes32 _referrerId) internal returns (uint256 mTokenAmount)
```

function to deposit into Midas vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | the address to receive the mTokens |
| _paymentTokenAmount | uint256 | the amount of paymentToken to deposit |
| _minReceiveAmount | uint256 | the minimum amount of mTokens to receive |
| _referrerId | bytes32 | the referrer id for the user |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mTokenAmount | uint256 | the amount of mTokens received |

### _redeem

```solidity
function _redeem(address _receiver, uint256 _mTokenAmount, uint256 _minReceiveAmount) internal returns (uint256 paymentTokenAmount)
```

function to redeem from Midas vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | the address to receive the paymentToken |
| _mTokenAmount | uint256 | the amount of mTokens to redeem |
| _minReceiveAmount | uint256 | the minimum amount of paymentToken to receive |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentTokenAmount | uint256 | the amount of paymentToken received |

### _balanceOf

```solidity
function _balanceOf(address _token, address _of) internal view returns (uint256)
```

function to get the balance of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | the address of the token |
| _of | address | the address of the account |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | the balance of the token |

### _itsTransfer

```solidity
function _itsTransfer(string destinationChain, bytes destinationAddress, bytes32 tokenId, uint256 amount, uint256 gasValue) internal
```

internal function to transfer the token using ITS

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| destinationChain | string | the destination chain |
| destinationAddress | bytes | the destination address |
| tokenId | bytes32 | the ITS tokenId |
| amount | uint256 | the amount of the token |
| gasValue | uint256 | the gas value to be paid for the transfer |

### _bytesToAddress

```solidity
function _bytesToAddress(bytes b) internal pure returns (address addr)
```

internal function to convert a bytes to an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| b | bytes | bytes value encode using `abi.encodePacked(address)` |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | the address |

### _tokenAmountToBase18

```solidity
function _tokenAmountToBase18(uint256 amount) internal view returns (uint256)
```

internal function to convert a token amount to base18

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | the amount of the token |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | the amount in base18 |

## IMidasAxelarVaultExecutable

Interface for the MidasAxelarVaultExecutable contract

### Sent

```solidity
event Sent(bytes32 commandId)
```

event emitted when a operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| commandId | bytes32 | the commandId of the send operation |

### Refunded

```solidity
event Refunded(bytes32 commandId, bytes _error)
```

event emitted when a refund operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| commandId | bytes32 | the commandId of the refund operation |
| _error | bytes |  |

### Deposited

```solidity
event Deposited(bytes sender, bytes recipient, string destinationChain, uint256 paymentTokenAmount, uint256 mTokenAmount)
```

event emitted when a deposit operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | bytes | the sender of the deposit operation |
| recipient | bytes | the recipient of the deposit operation |
| destinationChain | string | the destination chain of the deposit operation |
| paymentTokenAmount | uint256 | the amount of payment tokens deposited |
| mTokenAmount | uint256 | the amount of m tokens deposited |

### Redeemed

```solidity
event Redeemed(bytes sender, bytes recipient, string destinationChain, uint256 mTokenAmount, uint256 paymentTokenAmount)
```

event emitted when a redemption operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | bytes | the sender of the redemption operation |
| recipient | bytes | the recipient of the redemption operation |
| destinationChain | string | the destination chain of the redemption operation |
| mTokenAmount | uint256 | the amount of m tokens redeemed |
| paymentTokenAmount | uint256 | the amount of payment tokens redeemed |

### OnlySelf

```solidity
error OnlySelf(address caller)
```

error emitted when the caller is not the self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | the caller of the function |

### OnlyValidExecutableTokenId

```solidity
error OnlyValidExecutableTokenId(bytes32 tokenId)
```

error emitted when the tokenId is not a valid executable tokenId

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | bytes32 | the tokenId of the ITS token |

### depositVault

```solidity
function depositVault() external view returns (contract IDepositVault)
```

getter for the deposit vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDepositVault | the deposit vault |

### redemptionVault

```solidity
function redemptionVault() external view returns (contract IRedemptionVault)
```

getter for the redemption vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IRedemptionVault | the redemption vault |

### paymentTokenId

```solidity
function paymentTokenId() external view returns (bytes32)
```

getter for the paymentToken ITS id

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | the paymentToken ITS id |

### paymentTokenErc20

```solidity
function paymentTokenErc20() external view returns (address)
```

getter for the paymentToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the paymentToken ERC20 |

### mTokenId

```solidity
function mTokenId() external view returns (bytes32)
```

getter for the mToken ITS id

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | the mToken ITS id |

### mTokenErc20

```solidity
function mTokenErc20() external view returns (address)
```

getter for the mToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the mToken ERC20 |

### depositAndSend

```solidity
function depositAndSend(uint256 _paymentTokenAmount, bytes _data) external payable
```

deposits and sends the paymentToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentTokenAmount | uint256 | the amount of payment tokens to deposit |
| _data | bytes | encoded data for the deposit. Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,bytes32 referrerId,string receiverChainName); |

### redeemAndSend

```solidity
function redeemAndSend(uint256 _mTokenAmount, bytes _data) external payable
```

redeems and sends the mToken to the destination chain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mTokenAmount | uint256 | the amount of m tokens to redeem |
| _data | bytes | encoded data for the redemption Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,string receiverChainName); |

## MidasLzVaultComposerSync

This contract is a composer that allows deposits and redemptions operations against a
        synchronous vault across different chains using LayerZero's OFT protocol.

_The contract is designed to handle deposits and redemptions of vault mTokens and paymentTokens,
     ensuring that the mToken and paymentToken are correctly managed and transferred across chains.
     It also includes slippage protection and refund mechanisms for failed transactions.
Default refunds are enabled to EOA addresses only on the source._

### TokenAddressMismatch

```solidity
error TokenAddressMismatch(address oftTokenValue, address dvValue, address rvValue)
```

error for token address mismatch

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| oftTokenValue | address | address of OFT token |
| dvValue | address | address of mToken of deposit vault |
| rvValue | address | address of mToken of redemption vault |

### InvalidTokenRate

```solidity
error InvalidTokenRate(address feed)
```

error for invalid token rate

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feed | address | address of failed data feed contract |

### depositVault

```solidity
contract IDepositVault depositVault
```

getter for the deposit vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### redemptionVault

```solidity
contract IRedemptionVault redemptionVault
```

getter for the redemption vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenOft

```solidity
address paymentTokenOft
```

getter for the paymentToken OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenErc20

```solidity
address paymentTokenErc20
```

getter for the paymentToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### mTokenOft

```solidity
address mTokenOft
```

getter for the mToken OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### mTokenErc20

```solidity
address mTokenErc20
```

getter for the mToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### paymentTokenDecimals

```solidity
uint8 paymentTokenDecimals
```

decimals of `paymentTokenErc20`

### lzEndpoint

```solidity
address lzEndpoint
```

getter for the LayerZero endpoint

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### thisChaindEid

```solidity
uint32 thisChaindEid
```

getter for the current chain EID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### constructor

```solidity
constructor(address _depositVault, address _redemptionVault, address _paymentTokenOft, address _mTokenOft) public
```

### initialize

```solidity
function initialize() external
```

Initializes the contract

### lzCompose

```solidity
function lzCompose(address _composeSender, bytes32 _guid, bytes _message, address, bytes) external payable
```

Handles LayerZero compose operations for vault transactions with automatic refund functionality

_This composer is designed to handle refunds to an EOA address and not a contract
Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _composeSender | address | The OFT contract address used for refunds, must be either paymentTokenOft or mTokenOft |
| _guid | bytes32 | LayerZero's unique tx id (created on the source tx) |
| _message | bytes | Decomposable bytes object into [composeHeader][composeMessage] |
|  | address |  |
|  | bytes |  |

### handleCompose

```solidity
function handleCompose(address _oftIn, bytes32 _composeFrom, bytes _composeMsg, uint256 _amount) public payable virtual
```

Handles the compose operation for OFT transactions

_This function can only be called by the contract itself (self-call restriction)
     Decodes the compose message to extract SendParam and minimum message value
     Routes to either deposit or redeem flow based on the input OFT token type_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oftIn | address | The OFT token whose funds have been received in the lzReceive associated with this lzTx |
| _composeFrom | bytes32 | The bytes32 identifier of the compose sender |
| _composeMsg | bytes | The encoded message containing SendParam, minMsgValue and extraOptions |
| _amount | uint256 | The amount of tokens received in the lzReceive associated with this lzTx |

### depositAndSend

```solidity
function depositAndSend(uint256 _paymentTokenAmount, bytes _extraOptions, struct SendParam _sendParam, address _refundAddress) external payable
```

Deposits payment token from the caller into the vault and sends them to the recipient

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _paymentTokenAmount | uint256 |  |
| _extraOptions | bytes |  |
| _sendParam | struct SendParam |  |
| _refundAddress | address |  |

### redeemAndSend

```solidity
function redeemAndSend(uint256 _mTokenAmount, bytes _extraOptions, struct SendParam _sendParam, address _refundAddress) external payable
```

Redeems vault mTokens and sends the resulting payment tokens to the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _mTokenAmount | uint256 |  |
| _extraOptions | bytes |  |
| _sendParam | struct SendParam |  |
| _refundAddress | address |  |

### _depositAndSend

```solidity
function _depositAndSend(bytes32 _depositor, uint256 _paymentTokenAmount, bytes _extraOptions, struct SendParam _sendParam, address _refundAddress) internal
```

This function first deposits the paymentTokens to mint mTokens, validates the mTokens meet minimum slippage requirements,
        then sends the minted mTokens cross-chain using the OFT protocol
The _sendParam.amountLD is updated to the actual mToken amount minted, and minAmountLD is reset to 0 for the send operation

_Internal function that deposits paymentTokens and sends mTokens to another chain_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _depositor | bytes32 | The depositor (bytes32 format to account for non-evm addresses) |
| _paymentTokenAmount | uint256 | The number of paymentTokens to deposit |
| _extraOptions | bytes | Extra options for the deposit operation |
| _sendParam | struct SendParam | Parameter that defines how to send the mTokens |
| _refundAddress | address | Address to receive excess payment of the LZ fees |

### _redeemAndSend

```solidity
function _redeemAndSend(bytes32 _redeemer, uint256 _mTokenAmount, bytes, struct SendParam _sendParam, address _refundAddress) internal
```

This function first redeems the specified mToken amount for the underlying paymentToken,
        validates the received amount against slippage protection, then initiates a cross-chain
        transfer of the redeemed paymentTokens using the OFT protocol
The minAmountLD in _sendParam is reset to 0 after slippage validation since the
        actual amount has already been verified

_Internal function that redeems mTokens for paymentTokens and sends them cross-chain_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _redeemer | bytes32 | The address of the redeemer in bytes32 format |
| _mTokenAmount | uint256 | The number of mTokens to redeem |
|  | bytes |  |
| _sendParam | struct SendParam | Parameter that defines how to send the paymentTokens |
| _refundAddress | address | Address to receive excess payment of the LZ fees |

### _deposit

```solidity
function _deposit(address _receiver, uint256 _paymentTokenAmount, uint256 _minReceiveAmount, bytes32 _referrerId) internal returns (uint256 mTokenAmount)
```

_Internal function to deposit paymentTokens into the vault_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | The address to receive the mTokens |
| _paymentTokenAmount | uint256 | The number of paymentTokens to deposit into the vault |
| _minReceiveAmount | uint256 | The minimum amount of mTokens to receive |
| _referrerId | bytes32 | The referrer id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| mTokenAmount | uint256 | The number of mTokens received from the vault deposit |

### _redeem

```solidity
function _redeem(address _receiver, uint256 _mTokenAmount, uint256 _minReceiveAmount) internal returns (uint256 paymentTokenAmount)
```

_Internal function to redeem mTokens from the vault_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _receiver | address | The address to receive the paymentTokens |
| _mTokenAmount | uint256 | The number of mTokens to redeem from the vault |
| _minReceiveAmount | uint256 | The minimum amount of paymentTokens to receive |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentTokenAmount | uint256 | The number of paymentTokens received from the vault redemption |

### _sendOft

```solidity
function _sendOft(address _oft, struct SendParam _sendParam, address _refundAddress) internal
```

_Internal function that handles token transfer to the recipient
If the destination eid is the same as the current eid, it transfers the tokens directly to the recipient
If the destination eid is different, it sends a LayerZero cross-chain transaction_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oft | address | The OFT contract address to use for sending |
| _sendParam | struct SendParam | The parameters for the send operation |
| _refundAddress | address | Address to receive excess payment of the LZ fees |

### _refund

```solidity
function _refund(address _oft, bytes _message, uint256 _amount, address _refundAddress) internal
```

_Internal function to refund input tokens to sender on source during a failed transaction_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oft | address | The OFT contract address used for refunding |
| _message | bytes | The original message that was sent |
| _amount | uint256 | The amount of tokens to refund |
| _refundAddress | address | Address to receive the refund |

### _requireNoValue

```solidity
function _requireNoValue() internal view
```

_Internal function to revert if msg.value is not 0_

### _parseDepositExtraOptions

```solidity
function _parseDepositExtraOptions(bytes _extraOptions) internal pure returns (bytes32 referrerId)
```

_Internal function to parse the extra options_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _extraOptions | bytes | The extra options for the deposit operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| referrerId | bytes32 | The referrer id |

### _balanceOf

```solidity
function _balanceOf(address _token, address _of) internal view returns (uint256)
```

_Internal function to get the balance of the token of the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | the address of the token |
| _of | address | the address of the account |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | balance The balance of the token of the contract |

### _tokenAmountToBase18

```solidity
function _tokenAmountToBase18(uint256 amount) internal view returns (uint256)
```

_Internal function to convert a token amount to base18_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of the token |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount in base18 |

### receive

```solidity
receive() external payable
```

========================== Receive =====================================

## IMidasLzVaultComposerSync

Interface for the MidasLzVaultComposerSync contract

### Sent

```solidity
event Sent(bytes32 guid)
```

event emitted when a send operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| guid | bytes32 | the guid of the send operation |

### Refunded

```solidity
event Refunded(bytes32 guid)
```

event emitted when a refund operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| guid | bytes32 | the guid of the refund operation |

### Deposited

```solidity
event Deposited(bytes32 sender, bytes32 recipient, uint32 dstEid, uint256 paymentTokenAmount, uint256 mTokenAmount)
```

event emitted when a deposit operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | bytes32 | the sender of the deposit operation |
| recipient | bytes32 | the recipient of the deposit operation |
| dstEid | uint32 | the destination eid of the deposit operation |
| paymentTokenAmount | uint256 | the amount of payment tokens deposited |
| mTokenAmount | uint256 | the amount of m tokens deposited |

### Redeemed

```solidity
event Redeemed(bytes32 sender, bytes32 recipient, uint32 dstEid, uint256 mTokenAmount, uint256 paymentTokenAmount)
```

event emitted when a redemption operation is successful

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | bytes32 | the sender of the redemption operation |
| recipient | bytes32 | the recipient of the redemption operation |
| dstEid | uint32 | the destination eid of the redemption operation |
| mTokenAmount | uint256 | the amount of m tokens redeemed |
| paymentTokenAmount | uint256 | the amount of payment tokens redeemed |

### OnlyEndpoint

```solidity
error OnlyEndpoint(address caller)
```

error emitted when the caller is not the endpoint

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | the caller of the function |

### OnlySelf

```solidity
error OnlySelf(address caller)
```

error emitted when the caller is not the self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | the caller of the function |

### OnlyValidComposeCaller

```solidity
error OnlyValidComposeCaller(address caller)
```

error emitted when the caller is not a valid compose caller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | the caller of the function |

### InsufficientMsgValue

```solidity
error InsufficientMsgValue(uint256 expectedMsgValue, uint256 actualMsgValue)
```

error emitted when the msg.value is insufficient

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| expectedMsgValue | uint256 | the expected msg.value |
| actualMsgValue | uint256 | the actual msg.value |

### NoMsgValueExpected

```solidity
error NoMsgValueExpected()
```

error emitted when msg.value expected to be 0 but is not

### depositVault

```solidity
function depositVault() external view returns (contract IDepositVault)
```

getter for the deposit vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDepositVault | the deposit vault |

### redemptionVault

```solidity
function redemptionVault() external view returns (contract IRedemptionVault)
```

getter for the redemption vault

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IRedemptionVault | the redemption vault |

### paymentTokenOft

```solidity
function paymentTokenOft() external view returns (address)
```

getter for the paymentToken OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the paymentToken OFT |

### paymentTokenErc20

```solidity
function paymentTokenErc20() external view returns (address)
```

getter for the paymentToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the paymentToken ERC20 |

### mTokenOft

```solidity
function mTokenOft() external view returns (address)
```

getter for the mToken OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the mToken OFT |

### mTokenErc20

```solidity
function mTokenErc20() external view returns (address)
```

getter for the mToken ERC20

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the mToken ERC20 |

### lzEndpoint

```solidity
function lzEndpoint() external view returns (address)
```

getter for the LayerZero endpoint

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | the LayerZero endpoint |

### thisChaindEid

```solidity
function thisChaindEid() external view returns (uint32)
```

getter for the current chain EID

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 | the current chain EID |

### depositAndSend

```solidity
function depositAndSend(uint256 paymentTokenAmount, bytes extraOptions, struct SendParam sendParam, address refundAddress) external payable
```

Deposits payment token from the caller into the vault and sends them to the recipient

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| paymentTokenAmount | uint256 | The number of ERC20 tokens to deposit and send |
| extraOptions | bytes | Extra options for the deposit operation. Expected extraOptions: abi.encode(bytes32 referrerId) or 0x |
| sendParam | struct SendParam | Parameters on how to send the mTokens to the recipient |
| refundAddress | address | Address to receive excess `msg.value` |

### redeemAndSend

```solidity
function redeemAndSend(uint256 mTokenAmount, bytes extraOptions, struct SendParam sendParam, address refundAddress) external payable
```

Redeems vault mTokens and sends the resulting payment tokens to the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mTokenAmount | uint256 | The number of vault mTokens to redeem |
| extraOptions | bytes | Extra options for the redeem operation. Expected extraOptions: 0x |
| sendParam | struct SendParam | Parameter that defines how to send the payment tokens to the recipient |
| refundAddress | address | Address to receive excess payment of the LZ fees |

### receive

```solidity
receive() external payable
```

========================== Receive =====================================

## JivDepositVault

Smart contract that handles JIV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## JivMidasAccessControlRoles

Base contract that stores all roles descriptors for JIV contracts

### JIV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 JIV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage JivDepositVault

### JIV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 JIV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage JivRedemptionVault

### JIV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 JIV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage JivCustomAggregatorFeed and JivDataFeed

## AcreMBtc1DepositVault

Smart contract that handles acremBTC1 minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## AcreMBtc1MidasAccessControlRoles

Base contract that stores all roles descriptors for acremBTC1 contracts

### ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage AcreMBtc1DepositVault

### ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage AcreMBtc1RedemptionVault

### ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage AcreMBtc1CustomAggregatorFeed and AcreMBtc1DataFeed

## CUsdoDepositVault

Smart contract that handles cUSDO minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## CUsdoMidasAccessControlRoles

Base contract that stores all roles descriptors for cUSDO contracts

### C_USDO_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 C_USDO_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage CUsdoDepositVault

### C_USDO_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 C_USDO_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage CUsdoRedemptionVault

### C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage CUsdoCustomAggregatorFeed and CUsdoDataFeed

## DnEthDepositVault

Smart contract that handles dnETH minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnEthMidasAccessControlRoles

Base contract that stores all roles descriptors for dnETH contracts

### DN_ETH_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_ETH_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage DnEthDepositVault

### DN_ETH_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_ETH_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage DnEthRedemptionVault

### DN_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 DN_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage DnEthCustomAggregatorFeed and DnEthDataFeed

## DnFartDepositVault

Smart contract that handles dnFART minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnFartMidasAccessControlRoles

Base contract that stores all roles descriptors for dnFART contracts

### DN_FART_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_FART_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage DnFartDepositVault

### DN_FART_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_FART_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage DnFartRedemptionVault

### DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage DnFartCustomAggregatorFeed and DnFartDataFeed

## DnHypeDepositVault

Smart contract that handles dnHYPE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnHypeMidasAccessControlRoles

Base contract that stores all roles descriptors for dnHYPE contracts

### DN_HYPE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_HYPE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage DnHypeDepositVault

### DN_HYPE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_HYPE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage DnHypeRedemptionVault

### DN_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 DN_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage DnHypeCustomAggregatorFeed and DnHypeDataFeed

## DnPumpDepositVault

Smart contract that handles dnPUMP minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnPumpMidasAccessControlRoles

Base contract that stores all roles descriptors for dnPUMP contracts

### DN_PUMP_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_PUMP_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage DnPumpDepositVault

### DN_PUMP_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_PUMP_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage DnPumpRedemptionVault

### DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage DnPumpCustomAggregatorFeed and DnPumpDataFeed

## DnTestDepositVault

Smart contract that handles dnTEST minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnTestMidasAccessControlRoles

Base contract that stores all roles descriptors for dnTEST contracts

### DN_TEST_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_TEST_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage DnTestDepositVault

### DN_TEST_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 DN_TEST_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage DnTestRedemptionVault

### DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage DnTestCustomAggregatorFeed and DnTestDataFeed

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

## HBUsdcDepositVault

Smart contract that handles hbUSDC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HBUsdcMidasAccessControlRoles

Base contract that stores all roles descriptors for hbUSDC contracts

### HB_USDC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_USDC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage HBUsdcDepositVault

### HB_USDC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 HB_USDC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage HBUsdcRedemptionVault

### HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage HBUsdcCustomAggregatorFeed and HBUsdcDataFeed

## HBUsdtDepositVault

Smart contract that handles hbUSDT minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

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

## HBXautDepositVault

Smart contract that handles hbXAUt minting

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

## HypeBtcDepositVault

Smart contract that handles hypeBTC minting

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

## HypeEthDepositVault

Smart contract that handles hypeETH minting

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

## HypeUsdDepositVault

Smart contract that handles hypeUSD minting

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

## KitBtcDepositVault

Smart contract that handles kitBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for kitBTC contracts

### KIT_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage KitBtcDepositVault

### KIT_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage KitBtcRedemptionVault

### KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage KitBtcCustomAggregatorFeed and KitBtcDataFeed

## KitHypeDepositVault

Smart contract that handles kitHYPE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitHypeMidasAccessControlRoles

Base contract that stores all roles descriptors for kitHYPE contracts

### KIT_HYPE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_HYPE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage KitHypeDepositVault

### KIT_HYPE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_HYPE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage KitHypeRedemptionVault

### KIT_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 KIT_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage KitHypeCustomAggregatorFeed and KitHypeDataFeed

## KitUsdDepositVault

Smart contract that handles kitUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for kitUSD contracts

### KIT_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage KitUsdDepositVault

### KIT_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 KIT_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage KitUsdRedemptionVault

### KIT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 KIT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage KitUsdCustomAggregatorFeed and KitUsdDataFeed

## KmiUsdDepositVault

Smart contract that handles kmiUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KmiUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for kmiUSD contracts

### KMI_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 KMI_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage KmiUsdDepositVault

### KMI_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 KMI_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage KmiUsdRedemptionVault

### KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage KmiUsdCustomAggregatorFeed and KmiUsdDataFeed

## LiquidHypeDepositVault

Smart contract that handles liquidHYPE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LiquidHypeMidasAccessControlRoles

Base contract that stores all roles descriptors for liquidHYPE contracts

### LIQUID_HYPE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 LIQUID_HYPE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage LiquidHypeDepositVault

### LIQUID_HYPE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 LIQUID_HYPE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage LiquidHypeRedemptionVault

### LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage LiquidHypeCustomAggregatorFeed and LiquidHypeDataFeed

## LiquidReserveDepositVault

Smart contract that handles liquidRESERVE minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LiquidReserveMidasAccessControlRoles

Base contract that stores all roles descriptors for liquidRESERVE contracts

### LIQUID_RESERVE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 LIQUID_RESERVE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage LiquidReserveDepositVault

### LIQUID_RESERVE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 LIQUID_RESERVE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage LiquidReserveRedemptionVault

### LIQUID_RESERVE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 LIQUID_RESERVE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage LiquidReserveCustomAggregatorFeed and LiquidReserveDataFeed

## LstHypeDepositVault

Smart contract that handles LstHype minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LstHypeMidasAccessControlRoles

Base contract that stores all roles descriptors for lstHYPE contracts

### LST_HYPE_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 LST_HYPE_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage LstHypeDepositVault

### LST_HYPE_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 LST_HYPE_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage LstHypeRedemptionVault

### LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage LstHypeCustomAggregatorFeed and LstHypeDataFeed

## MApolloDepositVault

Smart contract that handles mAPOLLO minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MApolloMidasAccessControlRoles

Base contract that stores all roles descriptors for mAPOLLO contracts

### M_APOLLO_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_APOLLO_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MApolloDepositVault

### M_APOLLO_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_APOLLO_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MApolloRedemptionVault

### M_APOLLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_APOLLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MApolloCustomAggregatorFeed and MApolloDataFeed

## MBasisDepositVault

Smart contract that handles mBASIS minting

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

## MBtcDepositVault

Smart contract that handles mBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

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

## TACmBtcDepositVault

Smart contract that handles TACmBTC minting

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

## MEdgeDepositVault

Smart contract that handles mEDGE minting

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

## TACmEdgeDepositVault

Smart contract that handles TACmEdge minting

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

## MEvUsdDepositVault

Smart contract that handles mEVUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MEvUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for mEVUSD contracts

### M_EV_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_EV_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MEvUsdDepositVault

### M_EV_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_EV_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MEvUsdRedemptionVault

### M_EV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_EV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MEvUsdCustomAggregatorFeed and MEvUsdDataFeed

## MFarmDepositVault

Smart contract that handles mFARM minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFarmMidasAccessControlRoles

Base contract that stores all roles descriptors for mFARM contracts

### M_FARM_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_FARM_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MFarmDepositVault

### M_FARM_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_FARM_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MFarmRedemptionVault

### M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MFarmCustomAggregatorFeed and MFarmDataFeed

## MFOneDepositVault

Smart contract that handles mF-ONE minting

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

## MHyperDepositVault

Smart contract that handles mHYPER minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperMidasAccessControlRoles

Base contract that stores all roles descriptors for mHYPER contracts

### M_HYPER_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MHyperDepositVault

### M_HYPER_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MHyperRedemptionVault

### M_HYPER_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_HYPER_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MHyperCustomAggregatorFeed and MHyperDataFeed

## MHyperBtcDepositVault

Smart contract that handles mHyperBTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperBtcMidasAccessControlRoles

Base contract that stores all roles descriptors for mHyperBTC contracts

### M_HYPER_BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MHyperBtcDepositVault

### M_HYPER_BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MHyperBtcRedemptionVault

### M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MHyperBtcCustomAggregatorFeed and MHyperBtcDataFeed

## MHyperEthDepositVault

Smart contract that handles mHyperETH minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperEthMidasAccessControlRoles

Base contract that stores all roles descriptors for mHyperETH contracts

### M_HYPER_ETH_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_ETH_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MHyperEthDepositVault

### M_HYPER_ETH_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_HYPER_ETH_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MHyperEthRedemptionVault

### M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MHyperEthCustomAggregatorFeed and MHyperEthDataFeed

## MKRalphaDepositVault

Smart contract that handles mKRalpha minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MKRalphaMidasAccessControlRoles

Base contract that stores all roles descriptors for mKRalpha contracts

### M_KRALPHA_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_KRALPHA_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MKRalphaDepositVault

### M_KRALPHA_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_KRALPHA_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MKRalphaRedemptionVault

### M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MKRalphaCustomAggregatorFeed and MKRalphaDataFeed

## MLiquidityDepositVault

Smart contract that handles mLIQUIDITY minting

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

## MM1UsdDepositVault

Smart contract that handles mM1USD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MM1UsdMidasAccessControlRoles

Base contract that stores all roles descriptors for mM1USD contracts

### M_M1_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_M1_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MM1UsdDepositVault

### M_M1_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_M1_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MM1UsdRedemptionVault

### M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MM1UsdCustomAggregatorFeed and MM1UsdDataFeed

## MMevDepositVault

Smart contract that handles mMEV minting

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

## TACmMevDepositVault

Smart contract that handles TACmMEV minting

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

## MPortofinoDepositVault

Smart contract that handles mPortofino minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MPortofinoMidasAccessControlRoles

Base contract that stores all roles descriptors for mPortofino contracts

### M_PORTOFINO_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_PORTOFINO_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MPortofinoDepositVault

### M_PORTOFINO_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_PORTOFINO_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MPortofinoRedemptionVault

### M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MPortofinoCustomAggregatorFeed and MPortofinoDataFeed

## MRe7DepositVault

Smart contract that handles mRE7 minting

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

## MRe7BtcDepositVault

Smart contract that handles mRE7BTC minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7BtcMidasAccessControlRoles

Base contract that stores all roles descriptors for mRE7BTC contracts

### M_RE7BTC_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7BTC_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MRe7BtcDepositVault

### M_RE7BTC_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_RE7BTC_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MRe7BtcRedemptionVault

### M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MRe7BtcCustomAggregatorFeed and MRe7BtcDataFeed

## MRe7SolDepositVault

Smart contract that handles mRE7SOL minting

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

## MRoxDepositVault

Smart contract that handles mROX minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRoxMidasAccessControlRoles

Base contract that stores all roles descriptors for mROX contracts

### M_ROX_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_ROX_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MRoxDepositVault

### M_ROX_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_ROX_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MRoxRedemptionVault

### M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MRoxCustomAggregatorFeed and MRoxDataFeed

## MSlDepositVault

Smart contract that handles mSL minting

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

## MTuDepositVault

Smart contract that handles mTU minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MTuMidasAccessControlRoles

Base contract that stores all roles descriptors for mTU contracts

### M_TU_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_TU_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MTuDepositVault

### M_TU_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_TU_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MTuRedemptionVault

### M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MTuCustomAggregatorFeed and MTuDataFeed

## MWildUsdDepositVault

Smart contract that handles mWildUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MWildUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for mWildUSD contracts

### M_WILD_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_WILD_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MWildUsdDepositVault

### M_WILD_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_WILD_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MWildUsdRedemptionVault

### M_WILD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_WILD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MWildUsdCustomAggregatorFeed and MWildUsdDataFeed

## MXrpDepositVault

Smart contract that handles mXRP minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MXrpMidasAccessControlRoles

Base contract that stores all roles descriptors for mXRP contracts

### M_XRP_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_XRP_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MXrpDepositVault

### M_XRP_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_XRP_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MXrpRedemptionVault

### M_XRP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_XRP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MXrpCustomAggregatorFeed and MXrpDataFeed

## MevBtcDepositVault

Smart contract that handles mevBTC minting

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

## MSyrupUsdDepositVault

Smart contract that handles msyrupUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSyrupUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for msyrupUSD contracts

### M_SYRUP_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MSyrupUsdDepositVault

### M_SYRUP_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MSyrupUsdRedemptionVault

### M_SYRUP_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MSyrupUsdCustomAggregatorFeed and MSyrupUsdDataFeed

## MSyrupUsdpDepositVault

Smart contract that handles msyrupUSDp minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSyrupUsdpMidasAccessControlRoles

Base contract that stores all roles descriptors for msyrupUSDp contracts

### M_SYRUP_USDP_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USDP_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage MSyrupUsdpDepositVault

### M_SYRUP_USDP_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USDP_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage MSyrupUsdpRedemptionVault

### M_SYRUP_USDP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_SYRUP_USDP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MSyrupUsdpCustomAggregatorFeed and MSyrupUsdpDataFeed

## ObeatUsdDepositVault

Smart contract that handles obeatUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ObeatUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for obeatUSD contracts

### OBEAT_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 OBEAT_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage ObeatUsdDepositVault

### OBEAT_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 OBEAT_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage ObeatUsdRedemptionVault

### OBEAT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 OBEAT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage ObeatUsdCustomAggregatorFeed and ObeatUsdDataFeed

## PlUsdDepositVault

Smart contract that handles plUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## PlUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for plUSD contracts

### PL_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 PL_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage PlUsdDepositVault

### PL_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 PL_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage PlUsdRedemptionVault

### PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage PlUsdCustomAggregatorFeed and PlUsdDataFeed

## SLInjDepositVault

Smart contract that handles sLINJ minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## SLInjMidasAccessControlRoles

Base contract that stores all roles descriptors for sLINJ contracts

### SL_INJ_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 SL_INJ_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage SLInjDepositVault

### SL_INJ_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 SL_INJ_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage SLInjRedemptionVault

### SL_INJ_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 SL_INJ_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage SLInjCustomAggregatorFeed and SLInjDataFeed

## SplUsdDepositVault

Smart contract that handles splUSD minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## SplUsdMidasAccessControlRoles

Base contract that stores all roles descriptors for splUSD contracts

### SPL_USD_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 SPL_USD_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage SplUsdDepositVault

### SPL_USD_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 SPL_USD_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage SplUsdRedemptionVault

### SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage SplUsdCustomAggregatorFeed and SplUsdDataFeed

## TBtcDepositVault

Smart contract that handles tBTC minting

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

## TEthDepositVault

Smart contract that handles tETH minting

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

## TUsdeDepositVault

Smart contract that handles tUSDe minting

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

## TacTonDepositVault

Smart contract that handles tacTON minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TacTonMidasAccessControlRoles

Base contract that stores all roles descriptors for tacTON contracts

### TAC_TON_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_TON_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage TacTonDepositVault

### TAC_TON_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 TAC_TON_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage TacTonRedemptionVault

### TAC_TON_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 TAC_TON_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage TacTonCustomAggregatorFeed and TacTonDataFeed

## WNlpDepositVault

Smart contract that handles wNLP minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WNlpMidasAccessControlRoles

Base contract that stores all roles descriptors for wNLP contracts

### W_NLP_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 W_NLP_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage WNlpDepositVault

### W_NLP_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 W_NLP_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage WNlpRedemptionVault

### W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage WNlpCustomAggregatorFeed and WNlpDataFeed

## WVLPDepositVault

Smart contract that handles wVLP minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WVLPMidasAccessControlRoles

Base contract that stores all roles descriptors for wVLP contracts

### W_VLP_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 W_VLP_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage WVLPDepositVault

### W_VLP_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 W_VLP_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage WVLPRedemptionVault

### W_VLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 W_VLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage WVLPCustomAggregatorFeed and WVLPDataFeed

## WeEurDepositVault

Smart contract that handles weEUR minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WeEurMidasAccessControlRoles

Base contract that stores all roles descriptors for weEUR contracts

### WE_EUR_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 WE_EUR_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage WeEurDepositVault

### WE_EUR_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 WE_EUR_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage WeEurRedemptionVault

### WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage WeEurCustomAggregatorFeed and WeEurDataFeed

## ZeroGBtcvDepositVault

Smart contract that handles zeroGBTCV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGBtcvMidasAccessControlRoles

Base contract that stores all roles descriptors for zeroGBTCV contracts

### ZEROG_BTCV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_BTCV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGBtcvDepositVault

### ZEROG_BTCV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_BTCV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGBtcvRedemptionVault

### ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage ZeroGBtcvCustomAggregatorFeed and ZeroGBtcvDataFeed

## ZeroGEthvDepositVault

Smart contract that handles zeroGETHV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGEthvMidasAccessControlRoles

Base contract that stores all roles descriptors for zeroGETHV contracts

### ZEROG_ETHV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_ETHV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGEthvDepositVault

### ZEROG_ETHV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_ETHV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGEthvRedemptionVault

### ZEROG_ETHV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 ZEROG_ETHV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage ZeroGEthvCustomAggregatorFeed and ZeroGEthvDataFeed

## ZeroGUsdvDepositVault

Smart contract that handles zeroGUSDV minting

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGUsdvMidasAccessControlRoles

Base contract that stores all roles descriptors for zeroGUSDV contracts

### ZEROG_USDV_DEPOSIT_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_USDV_DEPOSIT_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGUsdvDepositVault

### ZEROG_USDV_REDEMPTION_VAULT_ADMIN_ROLE

```solidity
bytes32 ZEROG_USDV_REDEMPTION_VAULT_ADMIN_ROLE
```

actor that can manage ZeroGUsdvRedemptionVault

### ZEROG_USDV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 ZEROG_USDV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage ZeroGUsdvCustomAggregatorFeed and ZeroGUsdvDataFeed

## DepositVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
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
function _getTokenRate(address dataFeed, bool stable) internal view virtual returns (uint256)
```

_get token rate depends on data feed and stablecoin flag_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dataFeed | address | address of dataFeed from token config |
| stable | bool | is stablecoin |

### calculateHoldbackPartRateFromAvgTest

```solidity
function calculateHoldbackPartRateFromAvgTest(uint256 depositedUsdAmount, uint256 depositedInstantUsdAmount, uint256 mTokenRate, uint256 avgMTokenRate) external pure returns (uint256)
```

## DepositVaultWithAaveTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## DepositVaultWithMTokenTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## DepositVaultWithMorphoTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

### _requestTransferTokensToTokensReceiver

```solidity
function _requestTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## DepositVaultWithUSTBTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

### _instantTransferTokensToTokensReceiver

```solidity
function _instantTransferTokensToTokensReceiver(address tokenIn, uint256 amountToken, uint256 tokensDecimals) internal virtual
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## MidasAxelarVaultExecutableTester

### constructor

```solidity
constructor(address _depositVault, address _redemptionVault, bytes32 _paymentTokenId, bytes32 _mTokenId, address _interchainTokenService) public
```

### depositAndSendPublic

```solidity
function depositAndSendPublic(bytes _depositor, uint256 _paymentTokenAmount, bytes _data) external
```

### depositPublic

```solidity
function depositPublic(address _receiver, uint256 _paymentTokenAmount, uint256 _minReceiveAmount, bytes32 _referrerId) external returns (uint256 mTokenAmount)
```

### redeemAndSendPublic

```solidity
function redeemAndSendPublic(bytes _redeemer, uint256 _mTokenAmount, bytes _data) external
```

### redeemPublic

```solidity
function redeemPublic(address _receiver, uint256 _mTokenAmount, uint256 _minReceiveAmount) external virtual returns (uint256 paymentTokenAmount)
```

### balanceOfPublic

```solidity
function balanceOfPublic(address token, address _of) external view returns (uint256)
```

### itsTransferPublic

```solidity
function itsTransferPublic(string _destinationChain, bytes _destinationAddress, bytes32 _tokenId, uint256 _amount, uint256 _gasValue) external payable
```

### bytesToAddressPublic

```solidity
function bytesToAddressPublic(bytes _b) external pure returns (address)
```

## MidasLzVaultComposerSyncTester

### HandleComposeType

```solidity
enum HandleComposeType {
  NoOverride,
  ThrowsInsufficientBalanceError,
  ThrowsError
}
```

### handleComposeType

```solidity
enum MidasLzVaultComposerSyncTester.HandleComposeType handleComposeType
```

### constructor

```solidity
constructor(address _depositVault, address _redemptionVault, address _paymentTokenOft, address _mTokenOft) public
```

### setHandleComposeType

```solidity
function setHandleComposeType(enum MidasLzVaultComposerSyncTester.HandleComposeType _handleComposeType) external
```

### handleCompose

```solidity
function handleCompose(address _oftIn, bytes32 _composeFrom, bytes _composeMsg, uint256 _amount) public payable
```

Handles the compose operation for OFT transactions

_This function can only be called by the contract itself (self-call restriction)
     Decodes the compose message to extract SendParam and minimum message value
     Routes to either deposit or redeem flow based on the input OFT token type_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oftIn | address | The OFT token whose funds have been received in the lzReceive associated with this lzTx |
| _composeFrom | bytes32 | The bytes32 identifier of the compose sender |
| _composeMsg | bytes | The encoded message containing SendParam, minMsgValue and extraOptions |
| _amount | uint256 | The amount of tokens received in the lzReceive associated with this lzTx |

### depositAndSendPublic

```solidity
function depositAndSendPublic(bytes32 _depositor, uint256 _paymentTokenAmount, bytes _extraOptions, struct SendParam _sendParam, address _refundAddress) external
```

### depositPublic

```solidity
function depositPublic(address _receiver, uint256 _paymentTokenAmount, uint256 _minReceiveAmount, bytes32 _referrerId) external returns (uint256 mTokenAmount)
```

### redeemAndSendPublic

```solidity
function redeemAndSendPublic(bytes32 _redeemer, uint256 _mTokenAmount, bytes _extraOptions, struct SendParam _sendParam, address _refundAddress) external
```

### redeemPublic

```solidity
function redeemPublic(address _receiver, uint256 _mTokenAmount, uint256 _minReceiveAmount) external virtual returns (uint256 paymentTokenAmount)
```

### parseExtraOptionsPublic

```solidity
function parseExtraOptionsPublic(bytes _extraOptions) external pure returns (bytes32 referrerId)
```

### balanceOfPublic

```solidity
function balanceOfPublic(address _token, address _of) external view returns (uint256)
```

### sendOftPublic

```solidity
function sendOftPublic(address _oft, struct SendParam _sendParam, address _refundAddress) external payable
```

## RedemptionVault

Smart contract that handles mToken redemptions

### CalcAndValidateRedeemResult

return data of _calcAndValidateRedeem
packed into a struct to avoid stack too deep errors

```solidity
struct CalcAndValidateRedeemResult {
  uint256 feeAmount;
  uint256 amountTokenOutWithoutFee;
  uint256 amountTokenOut;
  uint256 tokenOutRate;
  uint256 mTokenRate;
  uint256 tokenOutDecimals;
}
```

### redeemRequests

```solidity
mapping(uint256 => struct RequestV2) redeemRequests
```

mapping, requestId to request data

### requestRedeemer

```solidity
address requestRedeemer
```

address is designated for standard redemptions, allowing tokens to be pulled from this address

### loanLp

```solidity
address loanLp
```

address of loan liquidity provider

### loanLpFeeReceiver

```solidity
address loanLpFeeReceiver
```

address of loan liquidity provider fee receiver

### loanRepaymentAddress

```solidity
address loanRepaymentAddress
```

address from which payment tokens will be pulled during loan repayment

### maxLoanApr

```solidity
uint64 maxLoanApr
```

maximum loan APR value in basis points (100 = 1%)

### preferLoanLiquidity

```solidity
bool preferLoanLiquidity
```

flag to determine if the loan LP liquidity should be used first

### loanSwapperVault

```solidity
contract IRedemptionVault loanSwapperVault
```

address of loan RedemptionVault-compatible vault

### currentLoanRequestId

```solidity
struct Counters.Counter currentLoanRequestId
```

last loan request id

### loanRequests

```solidity
mapping(uint256 => struct LiquidityProviderLoanRequest) loanRequests
```

mapping, loanRequestId to loan request data

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, struct RedemptionVaultInitParams _redemptionVaultInitParams, struct RedemptionVaultV2InitParams _redemptionVaultV2InitParams) public
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _redemptionVaultInitParams | struct RedemptionVaultInitParams | init params for redemption vault |
| _redemptionVaultV2InitParams | struct RedemptionVaultV2InitParams | init params for redemption vault v2 |

### initializeV2

```solidity
function initializeV2(struct CommonVaultV2InitParams _commonVaultV2InitParams, struct RedemptionVaultV2InitParams _redemptionVaultV2InitParams) public
```

v2 initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams |  |
| _redemptionVaultV2InitParams | struct RedemptionVaultV2InitParams | init params for redemption vault v2 |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mToken from the user.
Transfers fee in mToken to feeReceiver
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external
```

Does the same as original `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request
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

Does the same as original `redeemRequest` but allows specifying a custom tokensReceiver address.

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

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256)
```

Instantly redeems `instantShare` amount of `amountMTokenIn` and creates a request for the remaining amount.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| recipientRequest | address | address that receives tokens for the request part |
| instantShare | uint256 | % amount of `amountMTokenIn` that will be redeemed instantly |
| minReceiveAmountInstantShare | uint256 | min receive amount for the instant share |
| recipientInstant | address | address that receives tokens for the instant part |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | request id |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the mToken rate
from the request. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the
current mToken rate. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the
current mToken rate as avg rate. WONT fail even if there is not enough liquidity
to process all requests.
Does same validation as `safeApproveRequestAvgRate`.
Transfers tokenOut to users
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

### safeBulkApproveRequest

```solidity
function safeBulkApproveRequest(uint256[] requestIds, uint256 newOutRate) external
```

approving requests from the `requestIds` array using the `newMTokenRate`.
WONT fail even if there is not enough liquidity to process all requests.
Does same validation as `safeApproveRequest`.
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| newOutRate | uint256 |  |

### safeBulkApproveRequestAvgRate

```solidity
function safeBulkApproveRequestAvgRate(uint256[] requestIds, uint256 avgMTokenRate) external
```

approving requests from the `requestIds` array using the `avgMTokenRate`.
WONT fail even if there is not enough liquidity to process all requests.
Does same validation as `safeApproveRequestAvgRate`.
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### approveRequestAvgRate

```solidity
function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving redeem request if not exceed tokenOut allowance
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### safeApproveRequestAvgRate

```solidity
function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate) external
```

approving request if inputted token rate fit price diviation percent
Burns amount mToken from contract
Transfers tokenOut to user
Sets flag Processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

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

### bulkRepayLpLoanRequest

```solidity
function bulkRepayLpLoanRequest(uint256[] requestIds, uint64 loanApr) external
```

repaying loan requests from the `requestIds` array
Transfers tokenOut to loan repayment address
Transfers fee in tokenOut to loan lp fee receiver
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| loanApr | uint64 | loan APR. Overrides calculated loan fee in case if accrued interest is greater than the calculated loan fee. |

### cancelLpLoanRequest

```solidity
function cancelLpLoanRequest(uint256 requestId) external
```

canceling loan request
Sets request flags to Canceled.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### setRequestRedeemer

```solidity
function setRequestRedeemer(address redeemer) external
```

set address which is designated for standard redemptions, allowing tokens to be pulled from this address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| redeemer | address | new address of request redeemer |

### setLoanLp

```solidity
function setLoanLp(address newLoanLp) external
```

set address of loan liquidity provider

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLp | address | new address of loan liquidity provider |

### setLoanLpFeeReceiver

```solidity
function setLoanLpFeeReceiver(address newLoanLpFeeReceiver) external
```

set address of loan liquidity provider fee receiver

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFeeReceiver | address | new address of loan liquidity provider fee receiver |

### setLoanRepaymentAddress

```solidity
function setLoanRepaymentAddress(address newLoanRepaymentAddress) external
```

set address of loan repayment address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanRepaymentAddress | address | new address of loan repayment address |

### setLoanSwapperVault

```solidity
function setLoanSwapperVault(address newLoanSwapperVault) external
```

set address of loan swapper vault

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanSwapperVault | address | new address of loan swapper vault |

### setMaxLoanApr

```solidity
function setMaxLoanApr(uint64 newMaxLoanApr) external
```

set maximum loan APR value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxLoanApr | uint64 | new maximum loan APR value in basis points (100 = 1%) |

### setPreferLoanLiquidity

```solidity
function setPreferLoanLiquidity(bool newLoanLpFirst) external
```

set flag to determine if the loan LP liquidity should be used first

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFirst | bool | new flag to determine if the loan LP liquidity should be used first |

### vaultRole

```solidity
function vaultRole() public pure virtual returns (bytes32)
```

AC role of vault administrator

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### _safeBulkApproveRequest

```solidity
function _safeBulkApproveRequest(uint256[] requestIds, uint256 newOutRate, bool isAvgRate) internal
```

_internal function to approve requests_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids |
| newOutRate | uint256 | new out rate |
| isAvgRate | bool | if true, newOutRate is avg rate |

### _approveRequest

```solidity
function _approveRequest(uint256 requestId, uint256 newMTokenRate, bool isSafe, bool safeValidateLiquidity, bool isAvgRate) internal returns (bool)
```

_validates approve
burns amount from contract
transfer tokenOut to user
sets flag Processed_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newMTokenRate | uint256 | new mToken rate |
| isSafe | bool | new mToken rate |
| safeValidateLiquidity | bool | if true, checks if there is enough liquidity and if its not sufficient, function wont fail |
| isAvgRate | bool | if true, calculates holdback part rate from avg rate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | success true if success, false only in case if safeValidateLiquidity == true and there is not enough liquidity |

### _validateRequest

```solidity
function _validateRequest(address validateAddress, enum RequestStatus status) internal pure
```

validates request
if exist
if not processed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validateAddress | address | address to check if not zero |
| status | enum RequestStatus | request status |

### _redeemInstant

```solidity
function _redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address) internal virtual returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult)
```

_internal redeem instant logic_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | amount of mToken (decimals 18) |
| minReceiveAmount | uint256 | min amount of tokenOut to receive (decimals 18) |
|  | address |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| calcResult | struct RedemptionVault.CalcAndValidateRedeemResult | calculated redeem result |

### _sendTokensFromLiquidity

```solidity
function _sendTokensFromLiquidity(address tokenOut, address recipient, struct RedemptionVault.CalcAndValidateRedeemResult calcResult) internal
```

_Sends tokens from liquidity to the recipient_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| recipient | address | recipient address |
| calcResult | struct RedemptionVault.CalcAndValidateRedeemResult | calculated redeem result |

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address, uint256, uint256, uint256, uint256) internal virtual returns (uint256)
```

_Check if contract has enough tokenOut balance for redeem,
if not, obtains liquidity trough the custom strategies.
In default implementation it does nothing._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | obtainedLiquidityBase18 amount of tokenOut obtained |

### _useLoanLpLiquidity

```solidity
function _useLoanLpLiquidity(address tokenOut, uint256 missingAmountBase18, uint256 totalAmount, uint256 tokenOutRate, uint256 totalFee, uint256 tokenOutDecimals) internal returns (uint256, uint256)
```

_Check if contract has enough tokenOut balance for redeem;
if not, redeem the missing amount via loan LP liquidity_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
| totalAmount | uint256 | total amount of tokenOut needed in base 18 |
| tokenOutRate | uint256 | tokenOut rate |
| totalFee | uint256 | total fee of tokenOut |
| tokenOutDecimals | uint256 | decimals of tokenOut |

### _redeemRequest

```solidity
function _redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipient, uint256 amountMTokenInstant) internal returns (uint256 requestId)
```

internal redeem request logic

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | amount of mToken (decimals 18) |
| recipient | address | recipient address |
| amountMTokenInstant | uint256 | amount of mToken that was redeemed instantly |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### _convertUsdToToken

```solidity
function _convertUsdToToken(uint256 amountUsd, address tokenOut, uint256 overrideTokenRate) internal view returns (uint256 amountToken, uint256 tokenRate)
```

_calculates tokenOut amount from USD amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsd | uint256 | amount of USD (decimals 18) |
| tokenOut | address | tokenOut address |
| overrideTokenRate | uint256 | override token rate if not zero |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountToken | uint256 | converted USD to tokenOut |
| tokenRate | uint256 | conversion rate |

### _convertMTokenToUsd

```solidity
function _convertMTokenToUsd(uint256 amountMToken, uint256 overrideTokenRate) internal view returns (uint256 amountUsd, uint256 mTokenRate)
```

_calculates USD amount from mToken amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMToken | uint256 | amount of mToken (decimals 18) |
| overrideTokenRate | uint256 | override mToken rate if not zero |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountUsd | uint256 | converted amount to USD |
| mTokenRate | uint256 | conversion rate |

### _calcAndValidateRedeem

```solidity
function _calcAndValidateRedeem(address user, address tokenOut, uint256 amountMTokenIn, uint256 overrideMTokenRate, uint256 overrideTokenOutRate, bool shouldOverrideFeePercent, uint256 overrideFeePercent, bool isInstant) internal view virtual returns (struct RedemptionVault.CalcAndValidateRedeemResult result)
```

_validate redeem and calculate fee_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| tokenOut | address | tokenOut address |
| amountMTokenIn | uint256 | mToken amount (decimals 18) |
| overrideMTokenRate | uint256 | override mToken rate if not zero |
| overrideTokenOutRate | uint256 | override token rate if not zero |
| shouldOverrideFeePercent | bool | should override fee percent if true |
| overrideFeePercent | uint256 | override fee percent if shouldOverrideFeePercent is true |
| isInstant | bool | is instant operation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct RedemptionVault.CalcAndValidateRedeemResult | calc result |

### _convertMTokenToTokenOut

```solidity
function _convertMTokenToTokenOut(uint256 amountMTokenIn, uint256 overrideMTokenRate, address tokenOut, uint256 overrideTokenOutRate) internal view returns (uint256, uint256, uint256)
```

_converts mToken to tokenOut amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMTokenIn | uint256 | amount of mToken |
| overrideMTokenRate | uint256 | override mToken rate if not zero |
| tokenOut | address | tokenOut address |
| overrideTokenOutRate | uint256 | override token rate if not zero |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountTokenOut amount of tokenOut |
| [1] | uint256 | mTokenRate conversion rate |
| [2] | uint256 | tokenOutRate conversion rate |

### _validateMTokenAmount

```solidity
function _validateMTokenAmount(address user, uint256 amountMTokenIn) internal view
```

_validates mToken amount for different constraints_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| amountMTokenIn | uint256 | amount of mToken |

### _validateLiquidity

```solidity
function _validateLiquidity(address token, uint256 requiredLiquidity, uint256 tokenDecimals) internal view returns (bool)
```

### _calculateHoldbackPartRateFromAvg

```solidity
function _calculateHoldbackPartRateFromAvg(struct RequestV2 request, uint256 avgMTokenRate) internal pure returns (uint256)
```

_calculates holdback part rate from avg rate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct RequestV2 | request |
| avgMTokenRate | uint256 | avg mToken rate |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | holdback part rate |

## RedemptionVaultWithAave

Smart contract that handles redemptions using Aave V3 Pool withdrawals

_When the vault has insufficient payment token balance, it withdraws from
an Aave V3 Pool by burning its aTokens to obtain the underlying asset._

### aavePools

```solidity
mapping(address => contract IAaveV3Pool) aavePools
```

mapping payment token to Aave V3 Pool

### SetAavePool

```solidity
event SetAavePool(address caller, address token, address pool)
```

Emitted when an Aave V3 Pool is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |
| pool | address | Aave V3 Pool address |

### RemoveAavePool

```solidity
event RemoveAavePool(address caller, address token)
```

Emitted when an Aave V3 Pool is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |

### setAavePool

```solidity
function setAavePool(address _token, address _aavePool) external
```

Sets the Aave V3 Pool for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |
| _aavePool | address | Aave V3 Pool address for this token |

### removeAavePool

```solidity
function removeAavePool(address _token) external
```

Removes the Aave V3 Pool for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256, uint256 tokenOutDecimals) internal virtual returns (uint256)
```

Check if contract has enough tokenOut balance for redeem;
if not, withdraw the missing amount from the Aave V3 Pool

_The Aave Pool burns the vault's aTokens and transfers the underlying
asset directly to this contract. No approval is needed because the Pool
burns aTokens from msg.sender (this contract) internally._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
|  | uint256 |  |
|  | uint256 |  |
| tokenOutDecimals | uint256 | decimals of tokenOut |

## RedemptionVaultWithMToken

Smart contract that handles redemptions using mToken RedemptionVault withdrawals

_Storage layout is preserved for safe upgrades from RedemptionVaultWithSwapper_

### redemptionVault

```solidity
contract IRedemptionVault redemptionVault
```

### liquidityProvider_deprecated

```solidity
address liquidityProvider_deprecated
```

### SetRedemptionVault

```solidity
event SetRedemptionVault(address caller, address newVault)
```

Emitted when the redemption vault address is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| newVault | address | new redemption vault address |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, struct RedemptionVaultInitParams _redemptionInitParams, struct RedemptionVaultV2InitParams _redemptionVaultV2InitParams, address _redemptionVault) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _redemptionInitParams | struct RedemptionVaultInitParams | init params for redemption vault state values |
| _redemptionVaultV2InitParams | struct RedemptionVaultV2InitParams | init params for redemption vault v2 |
| _redemptionVault | address | address of the mTokenA RedemptionVault |

### setRedemptionVault

```solidity
function setRedemptionVault(address _redemptionVault) external
```

Sets the mTokenA RedemptionVault address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _redemptionVault | address | new RedemptionVault address |

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256 tokenOutRate, uint256, uint256) internal virtual returns (uint256)
```

Check if contract has enough tokenOut balance for redeem;
if not, redeem the missing amount via mToken RedemptionVault

_The other vault burns this contract's mToken and transfers the
underlying asset to this contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
| tokenOutRate | uint256 | tokenOut rate |
|  | uint256 |  |
|  | uint256 |  |

## RedemptionVaultWithMorpho

Smart contract that handles redemptions using Morpho Vault withdrawals

_When the vault has insufficient payment token balance, it withdraws from
a Morpho Vault (ERC-4626) by burning its vault shares to obtain the underlying asset.
Works with both Morpho Vaults V1 (MetaMorpho) and V2._

### morphoVaults

```solidity
mapping(address => contract IMorphoVault) morphoVaults
```

mapping payment token to Morpho Vault

### SetMorphoVault

```solidity
event SetMorphoVault(address caller, address token, address vault)
```

Emitted when a Morpho Vault is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |
| vault | address | Morpho Vault address |

### RemoveMorphoVault

```solidity
event RemoveMorphoVault(address caller, address token)
```

Emitted when a Morpho Vault is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address of the caller |
| token | address | payment token address |

### setMorphoVault

```solidity
function setMorphoVault(address _token, address _morphoVault) external
```

Sets the Morpho Vault for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |
| _morphoVault | address | Morpho Vault (ERC-4626) address for this token |

### removeMorphoVault

```solidity
function removeMorphoVault(address _token) external
```

Removes the Morpho Vault for a specific payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | payment token address |

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256, uint256 tokenOutDecimals) internal virtual returns (uint256)
```

Check if contract has enough tokenOut balance for redeem;
if not, withdraw the missing amount from the Morpho Vault

_The Morpho Vault burns the vault's shares and transfers the underlying
asset directly to this contract. No approval is needed because the vault
burns shares from msg.sender (this contract) when msg.sender == owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
|  | uint256 |  |
|  | uint256 |  |
| tokenOutDecimals | uint256 | decimals of tokenOut |

## RedemptionVaultWithSwapper

Legacy swapper contract that is keeped for layout compatibility
with already deployed contracts.

Legacy description:
Smart contract that handles mToken redemption.
In case of insufficient liquidity it uses a RV from a different
Midas product to fulfill instant redemption.

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
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams, struct RedemptionVaultInitParams _redemptionInitParams, struct RedemptionVaultV2InitParams _redemptionVaultV2InitParams, address _ustbRedemption) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _commonVaultV2InitParams | struct CommonVaultV2InitParams | init params for common vault v2 |
| _redemptionInitParams | struct RedemptionVaultInitParams | init params for redemption vault state values |
| _redemptionVaultV2InitParams | struct RedemptionVaultV2InitParams | init params for redemption vault v2 |
| _ustbRedemption | address | USTB redemption contract address |

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal virtual returns (uint256)
```

Check if contract has enough USDC balance for redeem
if not, trigger USTB redemption flow to redeem exactly the missing amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
|  | uint256 |  |
| currentTokenOutBalanceBase18 | uint256 | current balance of tokenOut in the vault in base 18 |
| tokenOutDecimals | uint256 | decimals of tokenOut |

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

## JivRedemptionVaultWithSwapper

Smart contract that handles JIV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## AcreMBtc1RedemptionVaultWithSwapper

Smart contract that handles acremBTC1 redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## CUsdoRedemptionVaultWithSwapper

Smart contract that handles cUSDO redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnEthRedemptionVaultWithSwapper

Smart contract that handles dnETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnFartRedemptionVaultWithSwapper

Smart contract that handles dnFART redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnHypeRedemptionVaultWithSwapper

Smart contract that handles dnHYPE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnPumpRedemptionVaultWithSwapper

Smart contract that handles dnPUMP redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## DnTestRedemptionVaultWithSwapper

Smart contract that handles dnTEST redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

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

## HBUsdcRedemptionVaultWithSwapper

Smart contract that handles hbUSDC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HBUsdtRedemptionVaultWithSwapper

Smart contract that handles hbUSDT redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HBXautRedemptionVaultWithSwapper

Smart contract that handles hbXAUt redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeBtcRedemptionVaultWithSwapper

Smart contract that handles hypeBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeEthRedemptionVaultWithSwapper

Smart contract that handles hypeETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## HypeUsdRedemptionVaultWithSwapper

Smart contract that handles hypeUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitBtcRedemptionVaultWithSwapper

Smart contract that handles kitBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitHypeRedemptionVaultWithSwapper

Smart contract that handles kitHYPE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KitUsdRedemptionVaultWithSwapper

Smart contract that handles kitUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## KmiUsdRedemptionVaultWithSwapper

Smart contract that handles kmiUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LiquidHypeRedemptionVaultWithSwapper

Smart contract that handles liquidHYPE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LiquidReserveRedemptionVaultWithSwapper

Smart contract that handles liquidRESERVE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## LstHypeRedemptionVaultWithSwapper

Smart contract that handles lstHYPE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MApolloRedemptionVaultWithSwapper

Smart contract that handles mAPOLLO redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MBasisRedemptionVault

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

## MBtcRedemptionVault

Smart contract that handles mBTC redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmBtcRedemptionVault

Smart contract that handles TACmBTC redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MEdgeRedemptionVaultWithSwapper

Smart contract that handles mEDGE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmEdgeRedemptionVault

Smart contract that handles TACmEDGE redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MEvUsdRedemptionVaultWithSwapper

Smart contract that handles mEVUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFarmRedemptionVaultWithSwapper

Smart contract that handles mFARM redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFOneRedemptionVaultWithMToken

Smart contract that handles mF-ONE redemptions using mToken
liquid strategy. Upgrade-compatible replacement for
MFOneRedemptionVaultWithSwapper.

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MFOneRedemptionVaultWithSwapper

Smart contract that handles mF-ONE redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperRedemptionVaultWithSwapper

Smart contract that handles mHYPER redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperBtcRedemptionVaultWithSwapper

Smart contract that handles mHyperBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MHyperEthRedemptionVaultWithSwapper

Smart contract that handles mHyperETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MKRalphaRedemptionVaultWithSwapper

Smart contract that handles mKRalpha redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MLiquidityRedemptionVault

Smart contract that handles mLIQUIDITY redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MM1UsdRedemptionVaultWithSwapper

Smart contract that handles mM1USD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MMevRedemptionVaultWithSwapper

Smart contract that handles mMEV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TACmMevRedemptionVault

Smart contract that handles TACmMEV redemption

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MPortofinoRedemptionVaultWithSwapper

Smart contract that handles mPortofino redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7RedemptionVaultWithSwapper

Smart contract that handles mRE7 redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7BtcRedemptionVaultWithSwapper

Smart contract that handles mRE7BTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRe7SolRedemptionVault

Smart contract that handles mRE7SOL redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MRoxRedemptionVaultWithSwapper

Smart contract that handles mROX redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSlRedemptionVaultWithMToken

Smart contract that handles mSL redemptions using mToken
liquid strategy. Upgrade-compatible replacement for
MSlRedemptionVaultWithSwapper.

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSlRedemptionVaultWithSwapper

Smart contract that handles mSL redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MTuRedemptionVaultWithSwapper

Smart contract that handles mTU redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MWildUsdRedemptionVaultWithSwapper

Smart contract that handles mWildUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MXrpRedemptionVaultWithSwapper

Smart contract that handles mXRP redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MevBtcRedemptionVaultWithSwapper

Smart contract that handles mevBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSyrupUsdRedemptionVaultWithSwapper

Smart contract that handles msyrupUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## MSyrupUsdpRedemptionVaultWithSwapper

Smart contract that handles msyrupUSDp redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ObeatUsdRedemptionVaultWithSwapper

Smart contract that handles obeatUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## PlUsdRedemptionVaultWithSwapper

Smart contract that handles plUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## SLInjRedemptionVaultWithSwapper

Smart contract that handles sLINJ redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## SplUsdRedemptionVaultWithSwapper

Smart contract that handles splUSD redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TBtcRedemptionVaultWithSwapper

Smart contract that handles tBTC redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TEthRedemptionVaultWithSwapper

Smart contract that handles tETH redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TUsdeRedemptionVaultWithSwapper

Smart contract that handles tUSDe redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## TacTonRedemptionVaultWithSwapper

Smart contract that handles tacTON redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WNlpRedemptionVaultWithSwapper

Smart contract that handles wNLP redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WVLPRedemptionVaultWithSwapper

Smart contract that handles wVLP redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## WeEurRedemptionVaultWithSwapper

Smart contract that handles weEUR redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGBtcvRedemptionVaultWithSwapper

Smart contract that handles zeroGBTCV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGEthvRedemptionVaultWithSwapper

Smart contract that handles zeroGETHV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## ZeroGUsdvRedemptionVaultWithSwapper

Smart contract that handles zeroGUSDV redemptions

### vaultRole

```solidity
function vaultRole() public pure returns (bytes32)
```

## RedemptionVaultTest

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

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
function calcAndValidateRedeemTest(address user, address tokenOut, uint256 amountMTokenIn, uint256 overrideMTokenRate, uint256 overrideTokenOutRate, bool shouldOverrideFeePercent, uint256 overrideFeePercent, bool isInstant) external returns (struct RedemptionVault.CalcAndValidateRedeemResult calcResult)
```

### calculateHoldbackPartRateFromAvgTest

```solidity
function calculateHoldbackPartRateFromAvgTest(uint256 amountMToken, uint256 amountMTokenInstant, uint256 mTokenRate, uint256 avgMTokenRate) external pure returns (uint256)
```

### convertUsdToTokenTest

```solidity
function convertUsdToTokenTest(uint256 amountUsd, address tokenOut, uint256 overrideTokenOutRate) external returns (uint256 amountToken, uint256 tokenRate)
```

### convertMTokenToUsdTest

```solidity
function convertMTokenToUsdTest(uint256 amountMToken, uint256 overrideMTokenRate) external returns (uint256 amountUsd, uint256 mTokenRate)
```

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

## RedemptionVaultWithAaveTest

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemAave

```solidity
function checkAndRedeemAave(address token, uint256 amount) external returns (uint256)
```

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## RedemptionVaultWithMTokenTest

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemMToken

```solidity
function checkAndRedeemMToken(address token, uint256 amount, uint256 rate) external returns (uint256)
```

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address token, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

## RedemptionVaultWithMorphoTest

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemMorpho

```solidity
function checkAndRedeemMorpho(address token, uint256 amount) external returns (uint256)
```

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address token, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

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
function _disableInitializers() internal virtual
```

### checkAndRedeemUSTB

```solidity
function checkAndRedeemUSTB(address token, uint256 amount) external returns (uint256)
```

### _useVaultLiquidity

```solidity
function _useVaultLiquidity(address tokenOut, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

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

## MidasTimelockController

Default TimelockController but with getters for proposers and executors

### constructor

```solidity
constructor(uint256 minDelay, address[] proposers, address[] executors) public
```

### getInitialProposers

```solidity
function getInitialProposers() external view returns (address[])
```

Get all the initial proposers

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | initial proposers addresses |

### getInitialExecutors

```solidity
function getInitialExecutors() external view returns (address[])
```

Get all the initial executors

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | initial executors addresses |

## CompositeDataFeed

A data feed contract that derives its price by computing the ratio
of two underlying data feeds (numerator ÷ denominator).

_Designed for cases where a synthetic or relative price is needed,
such as deriving cbBTC/BTC from cbBTC/USD and BTC/USD feeds._

### numeratorFeed

```solidity
contract IDataFeed numeratorFeed
```

price feed used as the numerator in the ratio calculation.

_typically represents the asset of interest (e.g., cbBTC/USD)._

### denominatorFeed

```solidity
contract IDataFeed denominatorFeed
```

price feed used as the denominator in the ratio calculation.

_typically represents the reference asset (e.g., BTC/USD)._

### minExpectedAnswer

```solidity
uint256 minExpectedAnswer
```

_minimal answer expected to receive from getDataInBase18_

### maxExpectedAnswer

```solidity
uint256 maxExpectedAnswer
```

_maximal answer expected to receive from getDataInBase18_

### initialize

```solidity
function initialize(address _ac, address _numeratorFeed, address _denominatorFeed, uint256 _minExpectedAnswer, uint256 _maxExpectedAnswer) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _ac | address | MidasAccessControl contract address |
| _numeratorFeed | address | numerator feed address |
| _denominatorFeed | address | denominator feed address |
| _minExpectedAnswer | uint256 | min. expected answer value from data feed |
| _maxExpectedAnswer | uint256 | max. expected answer value from data feed |

### changeNumeratorFeed

```solidity
function changeNumeratorFeed(address _numeratorFeed) external
```

updates `numeratorFeed` address

_can only be called by the feed admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numeratorFeed | address | new numerator feed address |

### changeDenominatorFeed

```solidity
function changeDenominatorFeed(address _denominatorFeed) external
```

updates `denominatorFeed` address

_can only be called by the feed admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _denominatorFeed | address | new denominator feed address |

### setMinExpectedAnswer

```solidity
function setMinExpectedAnswer(uint256 _minExpectedAnswer) external
```

_updates `minExpectedAnswer` value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minExpectedAnswer | uint256 | min value |

### setMaxExpectedAnswer

```solidity
function setMaxExpectedAnswer(uint256 _maxExpectedAnswer) external
```

_updates `maxExpectedAnswer` value_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | uint256 | max value |

### getDataInBase18

```solidity
function getDataInBase18() external view returns (uint256 answer)
```

_fetches answer from numerator and denominator feeds
and returns calculated answer (numerator / denominator)_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | calculated answer in base18 |

### _computeCompositePrice

```solidity
function _computeCompositePrice(uint256 numerator, uint256 denominator) internal pure virtual returns (uint256 answer)
```

_computes the composite price by dividing numerator by denominator_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| numerator | uint256 | numerator value from the first feed |
| denominator | uint256 | denominator value from the second feed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | computed composite price in base18 |

### feedAdminRole

```solidity
function feedAdminRole() public pure virtual returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## CompositeDataFeedMultiply

A data feed contract that derives its price by computing the product
of two underlying data feeds (numerator × denominator).

_Inherits from CompositeDataFeed and overrides only the calculation logic
to multiply instead of divide. Designed for cases where a synthetic or combined
price is needed, such as deriving mXRP/USD from mXRP/XRP and XRP/USD feeds._

### _computeCompositePrice

```solidity
function _computeCompositePrice(uint256 firstFeedValue, uint256 secondFeedValue) internal pure returns (uint256 answer)
```

_computes the composite price by multiplying the two feed values_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| firstFeedValue | uint256 | value from the first feed |
| secondFeedValue | uint256 | value from the second feed |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| answer | uint256 | computed composite price in base18 |

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
function initialize(address _accessControl, int192 _minAnswer, int192 _maxAnswer, uint256 _maxAnswerDeviation, string _description) public virtual
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

## CustomAggregatorV3CompatibleFeedGrowth

AggregatorV3 compatible feed, where price is submitted manually by feed admins
and growth apr % is applied to the answer.

### RoundDataWithGrowth

```solidity
struct RoundDataWithGrowth {
  uint80 roundId;
  uint80 answeredInRound;
  int80 growthApr;
  int256 answer;
  uint256 startedAt;
  uint256 updatedAt;
}
```

### description

```solidity
string description
```

feed description

### maxAnswerDeviation

```solidity
uint256 maxAnswerDeviation
```

max deviation from latest price in %

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

### minGrowthApr

```solidity
int80 minGrowthApr
```

minimal possible growth apr value that can be set

### maxGrowthApr

```solidity
int80 maxGrowthApr
```

maximal possible growth apr value that can be set

### latestRound

```solidity
uint80 latestRound
```

last round id

### onlyUp

```solidity
bool onlyUp
```

if true, the price can only increase

_applicable only for setRoundDataSafe_

### onlyAggregatorAdmin

```solidity
modifier onlyAggregatorAdmin()
```

_checks that msg.sender do have a feedAdminRole() role_

### initialize

```solidity
function initialize(address _accessControl, int192 _minAnswer, int192 _maxAnswer, uint256 _maxAnswerDeviation, int80 _minGrowthApr, int80 _maxGrowthApr, bool _onlyUp, string _description) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |
| _minAnswer | int192 | init value for `minAnswer`. Should be < `_maxAnswer` |
| _maxAnswer | int192 | init value for `maxAnswer`. Should be > `_minAnswer` |
| _maxAnswerDeviation | uint256 | init value for `maxAnswerDeviation` |
| _minGrowthApr | int80 | init value for `minGrowthApr` |
| _maxGrowthApr | int80 | init value for `maxGrowthApr` |
| _onlyUp | bool | init value for `onlyUp` |
| _description | string | init value for `description` |

### setOnlyUp

```solidity
function setOnlyUp(bool _onlyUp) external
```

updates onlyUp flag

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _onlyUp | bool | new onlyUp flag |

### setMaxGrowthApr

```solidity
function setMaxGrowthApr(int80 _maxGrowthApr) external
```

updates max growth apr

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxGrowthApr | int80 | new max growth apr |

### setMinGrowthApr

```solidity
function setMinGrowthApr(int80 _minGrowthApr) external
```

updates min growth apr

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minGrowthApr | int80 | new min growth apr |

### setRoundDataSafe

```solidity
function setRoundDataSafe(int256 _data, uint256 _dataTimestamp, int80 _growthApr) external
```

works as `setRoundData()`, but also checks the
deviation with the lattest submitted data

_deviation with previous data needs to be <= `maxAnswerDeviation`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |
| _dataTimestamp | uint256 | timestamp of the data in the past |
| _growthApr | int80 | growth apr value |

### setRoundData

```solidity
function setRoundData(int256 _data, uint256 _dataTimestamp, int80 _growthApr) public
```

sets the data for `latestRound` + 1 round id

_`_data` should be >= `minAnswer` and <= `maxAnswer`.
Function should be called only from permissioned actor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |
| _dataTimestamp | uint256 | timestamp of the data in the past |
| _growthApr | int80 | growth apr value |

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

returns data for latest round with growth applied

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | timestamp passed to setRoundData |
| updatedAt | uint256 | timestamp of the last price submission |
| answeredInRound | uint80 | answeredInRound |

### latestRoundDataRaw

```solidity
function latestRoundDataRaw() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound, int80 growthApr)
```

returns `latestRoundData` without growth applied

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | startedAt |
| updatedAt | uint256 | updatedAt |
| answeredInRound | uint80 | answeredInRound |
| growthApr | int80 | growthApr |

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
| [0] | int256 | answer of latest price submission |

### lastGrowthApr

```solidity
function lastGrowthApr() public view returns (int80)
```

returns the growth apr of the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int80 | growthApr latest growthApr value |

### lastTimestamp

```solidity
function lastTimestamp() public view returns (uint256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | `updatedAt` timestamp of latest price submission |

### lastStartedAt

```solidity
function lastStartedAt() public view returns (uint256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | `startedAt` timestamp of latest price submission |

### getRoundData

```solidity
function getRoundData(uint80 _roundId) public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

returns data for a specific round with growth applied

_growth to answer is only applied between [roundStartedAt,nextRoundUpdatedAt]
or if roundId is latestRound, block.timestamp will be used as nextRoundUpdatedAt_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roundId | uint80 | roundId |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | timestamp passed to setRoundData |
| updatedAt | uint256 | timestamp of the last price submission |
| answeredInRound | uint80 | answeredInRound |

### getRoundDataRaw

```solidity
function getRoundDataRaw(uint80 _roundId) public view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound, int80 growthApr)
```

returns data for a specific round without growth applied

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roundId | uint80 | roundId |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | startedAt |
| updatedAt | uint256 | updatedAt |
| answeredInRound | uint80 | answeredInRound |
| growthApr | int80 | growthApr value |

### feedAdminRole

```solidity
function feedAdminRole() public view virtual returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

### applyGrowth

```solidity
function applyGrowth(int256 _answer, int80 _growthApr, uint256 _timestampFrom) public view returns (int256)
```

applies growth to the answer until current timestamp

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | answer |
| _growthApr | int80 | growth apr |
| _timestampFrom | uint256 | timestamp from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | answer with growth applied |

### applyGrowth

```solidity
function applyGrowth(int256 _answer, int80 _growthApr, uint256 _timestampFrom, uint256 _timestampTo) public pure returns (int256)
```

applies growth to the answer between two timestamps

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | answer |
| _growthApr | int80 | growth apr |
| _timestampFrom | uint256 | timestamp from |
| _timestampTo | uint256 | timestamp to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | answer with growth applied |

### decimals

```solidity
function decimals() public pure returns (uint8)
```

### _getDeviation

```solidity
function _getDeviation(int256 _lastPrice, int256 _newPrice, bool _validateOnlyUp) internal pure returns (uint256)
```

_calculates a deviation in % between `_lastPrice` and `_newPrice`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lastPrice | int256 | last price |
| _newPrice | int256 | new price |
| _validateOnlyUp | bool | if true, will validate that deviation is positive |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | deviation in `decimals()` precision |

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

## IAggregatorV3CompatibleFeedGrowth

### AnswerUpdated

```solidity
event AnswerUpdated(int256 data, uint256 roundId, uint256 timestamp, int80 growthApr)
```

emitted when answer is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | int256 | data value without growth applied |
| roundId | uint256 | roundId |
| timestamp | uint256 | timestamp of the data in the past |
| growthApr | int80 | growthApr value |

### MaxGrowthAprUpdated

```solidity
event MaxGrowthAprUpdated(int80 newMaxGrowthApr)
```

emitted when max growth apr is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxGrowthApr | int80 | new max growth apr |

### MinGrowthAprUpdated

```solidity
event MinGrowthAprUpdated(int80 newMinGrowthApr)
```

emitted when min growth apr is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinGrowthApr | int80 | new min growth apr |

### OnlyUpUpdated

```solidity
event OnlyUpUpdated(bool newOnlyUp)
```

emitted when onlyUp flag is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newOnlyUp | bool | new onlyUp flag |

### setOnlyUp

```solidity
function setOnlyUp(bool _onlyUp) external
```

updates onlyUp flag

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _onlyUp | bool | new onlyUp flag |

### setMaxGrowthApr

```solidity
function setMaxGrowthApr(int80 _maxGrowthApr) external
```

updates max growth apr

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxGrowthApr | int80 | new max growth apr |

### setMinGrowthApr

```solidity
function setMinGrowthApr(int80 _minGrowthApr) external
```

updates min growth apr

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minGrowthApr | int80 | new min growth apr |

### setRoundDataSafe

```solidity
function setRoundDataSafe(int256 _data, uint256 _dataTimestamp, int80 _growthApr) external
```

works as `setRoundData()`, but also checks the
deviation with the lattest submitted data

_deviation with previous data needs to be <= `maxAnswerDeviation`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |
| _dataTimestamp | uint256 | timestamp of the data in the past |
| _growthApr | int80 | growth apr value |

### setRoundData

```solidity
function setRoundData(int256 _data, uint256 _dataTimestamp, int80 _growthApr) external
```

sets the data for `latestRound` + 1 round id

_`_data` should be >= `minAnswer` and <= `maxAnswer`.
Function should be called only from permissioned actor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |
| _dataTimestamp | uint256 | timestamp of the data in the past |
| _growthApr | int80 | growth apr value |

### latestRoundDataRaw

```solidity
function latestRoundDataRaw() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound, int80 growthApr)
```

returns `latestRoundData` without growth applied

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | startedAt |
| updatedAt | uint256 | updatedAt |
| answeredInRound | uint80 | answeredInRound |
| growthApr | int80 | growthApr |

### lastGrowthApr

```solidity
function lastGrowthApr() external view returns (int80)
```

returns the growth apr of the latest round

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int80 | growthApr latest growthApr value |

### getRoundDataRaw

```solidity
function getRoundDataRaw(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound, int80 growthApr)
```

returns data for a specific round without growth applied

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roundId | uint80 | roundId |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roundId | uint80 | roundId |
| answer | int256 | answer with growth applied |
| startedAt | uint256 | startedAt |
| updatedAt | uint256 | updatedAt |
| answeredInRound | uint80 | answeredInRound |
| growthApr | int80 | growthApr value |

### applyGrowth

```solidity
function applyGrowth(int256 _answer, int80 _growthApr, uint256 _timestampFrom) external view returns (int256)
```

applies growth to the answer until current timestamp

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | answer |
| _growthApr | int80 | growth apr |
| _timestampFrom | uint256 | timestamp from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | answer with growth applied |

### applyGrowth

```solidity
function applyGrowth(int256 _answer, int80 _growthApr, uint256 _timestampFrom, uint256 _timestampTo) external pure returns (int256)
```

applies growth to the answer between two timestamps

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | answer |
| _growthApr | int80 | growth apr |
| _timestampFrom | uint256 | timestamp from |
| _timestampTo | uint256 | timestamp to |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | answer with growth applied |

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

## mToken

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

mints mToken token `amount` to a given `to` address.
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

burns mToken token `amount` to a given `to` address.
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

puts mToken token on pause.
should be called only from permissioned actor

### unpause

```solidity
function unpause() external
```

puts mToken token on pause.
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

### _getNameSymbol

```solidity
function _getNameSymbol() internal virtual returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can mint mToken token_

### _burnerRole

```solidity
function _burnerRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can burn mToken token_

### _pauserRole

```solidity
function _pauserRole() internal pure virtual returns (bytes32)
```

_AC role, owner of which can pause mToken token_

## mTokenPermissioned

mToken with fully permissioned transfers

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual
```

_overrides _beforeTokenTransfer function to allow
greenlisted users to use the token transfers functions_

### _greenlistedRole

```solidity
function _greenlistedRole() internal pure virtual returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## IStdReference

### ReferenceData

A structure returned whenever someone requests for standard reference data.

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

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IBeHype

### BeHYPEToHYPE

```solidity
function BeHYPEToHYPE(uint256 beHYPEAmount) external view returns (uint256)
```

## BeHypeChainlinkAdapter

Adapter for beHYPE LST from hyperbeat for liquidHYPE redemptions

### beHype

```solidity
contract IBeHype beHype
```

### constructor

```solidity
constructor(address _beHype) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## ChainlinkAdapterBase

### decimals

```solidity
function decimals() public view virtual returns (uint8)
```

### description

```solidity
function description() external pure virtual returns (string)
```

### version

```solidity
function version() external view virtual returns (uint256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view virtual returns (uint256)
```

### latestRound

```solidity
function latestRound() public view virtual returns (uint256)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### getAnswer

```solidity
function getAnswer(uint256) public pure virtual returns (int256)
```

### getTimestamp

```solidity
function getTimestamp(uint256) external pure virtual returns (uint256)
```

### getRoundData

```solidity
function getRoundData(uint80) external view virtual returns (uint80, int256, uint256, uint256, uint80)
```

### latestRoundData

```solidity
function latestRoundData() external view virtual returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## CompositeDataFeedToBandStdAdapter

Converts CompositeDataFeed to Band Protocol's IStdReference interface

_Adapter that wraps CompositeDataFeed to provide Band Protocol standard reference data_

### constructor

```solidity
constructor(address _compositeDataFeed, string _baseSymbol, string _quoteSymbol) public
```

Constructor initializes the adapter with a CompositeDataFeed contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _compositeDataFeed | address | Address of the CompositeDataFeed contract providing composite price data |
| _baseSymbol | string | Symbol of the base token |
| _quoteSymbol | string | Symbol of the quote currency |

### _getTimestamp

```solidity
function _getTimestamp() internal view returns (uint256 timestamp)
```

Gets the timestamp for the price data

_Overrides base to handle composite feeds by taking min timestamp from numerator/denominator_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | The timestamp of the last price update |

## IStdReference

### ReferenceData

A structure returned whenever someone requests for standard reference data.

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

## DataFeedToBandStdAdapter

Converts DataFeed to Band Protocol's IStdReference interface

_Base adapter that wraps a DataFeed to provide Band Protocol standard reference data_

### dataFeed

```solidity
contract IDataFeed dataFeed
```

DataFeed contract providing validated price data

### baseSymbol

```solidity
string baseSymbol
```

Base token symbol

### quoteSymbol

```solidity
string quoteSymbol
```

Quote currency symbol

### constructor

```solidity
constructor(address _dataFeed, string _baseSymbol, string _quoteSymbol) public
```

Constructor initializes the adapter with a DataFeed contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dataFeed | address | Address of the DataFeed contract providing price data |
| _baseSymbol | string | Symbol of the base token |
| _quoteSymbol | string | Symbol of the quote currency |

### getReferenceData

```solidity
function getReferenceData(string _base, string _quote) external view returns (struct IStdReference.ReferenceData)
```

Returns the price data for the given base/quote pair

_Only supports the configured baseSymbol/quoteSymbol pair_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _base | string | The base token symbol |
| _quote | string | The quote currency symbol |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IStdReference.ReferenceData | ReferenceData containing rate and update timestamps |

### getReferenceDataBulk

```solidity
function getReferenceDataBulk(string[] _bases, string[] _quotes) external view returns (struct IStdReference.ReferenceData[])
```

Returns price data for multiple base/quote pairs

_Only supports single pair queries (array length must be 1)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _bases | string[] | Array of base token symbols (must have length 1) |
| _quotes | string[] | Array of quote currency symbols (must have length 1) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IStdReference.ReferenceData[] | Array containing single ReferenceData element |

### _getTimestamp

```solidity
function _getTimestamp() internal view virtual returns (uint256 timestamp)
```

Gets the timestamp for the price data

_Virtual function that can be overridden by child contracts_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| timestamp | uint256 | The timestamp of the last price update |

### _getAggregatorTimestamp

```solidity
function _getAggregatorTimestamp(contract IDataFeed feed) internal view returns (uint256)
```

Gets timestamp from a DataFeed via its aggregator

_Assumes the feed is a DataFeed. Reverts if not._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| feed | contract IDataFeed | The data feed to get timestamp from |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | timestamp The timestamp from the aggregator |

## ERC4626ChainlinkAdapter

_uses convertToAssets for the answer_

### vault

```solidity
address vault
```

erc4626 vault

### constructor

```solidity
constructor(address _vault) public
```

_constructor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _vault | address | erc4626 vault address |

### description

```solidity
function description() external pure virtual returns (string)
```

### decimals

```solidity
function decimals() public view returns (uint8)
```

### vaultDecimals

```solidity
function vaultDecimals() public view returns (uint8)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

## IMantleLspStaking

### mETHToETH

```solidity
function mETHToETH(uint256 mETHAmount) external view returns (uint256)
```

## MantleLspStakingChainlinkAdapter

example https://etherscan.io/address/0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f

### lspStaking

```solidity
contract IMantleLspStaking lspStaking
```

### constructor

```solidity
constructor(address _lspStaking) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## PythStructs

### Price

```solidity
struct Price {
  int64 price;
  uint64 conf;
  int32 expo;
  uint256 publishTime;
}
```

## IPyth

### getPriceUnsafe

```solidity
function getPriceUnsafe(bytes32 id) external view returns (struct PythStructs.Price price)
```

### getUpdateFee

```solidity
function getUpdateFee(bytes[] updateData) external view returns (uint256 feeAmount)
```

### updatePriceFeeds

```solidity
function updatePriceFeeds(bytes[] updateData) external payable
```

## PythChainlinkAdapter

### priceId

```solidity
bytes32 priceId
```

### pyth

```solidity
contract IPyth pyth
```

### constructor

```solidity
constructor(address _pyth, bytes32 _priceId) public
```

### updateFeeds

```solidity
function updateFeeds(bytes[] priceUpdateData) public payable
```

### decimals

```solidity
function decimals() public view virtual returns (uint8)
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view virtual returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## IRsEth

### rsETHPrice

```solidity
function rsETHPrice() external view returns (uint256)
```

## RsEthChainlinkAdapter

example https://etherscan.io/address/0x349A73444b1a310BAe67ef67973022020d70020d

### rsEth

```solidity
contract IRsEth rsEth
```

### constructor

```solidity
constructor(address _rsEth) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
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

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

### latestTimestamp

```solidity
function latestTimestamp() public view returns (uint256)
```

### latestRoundData

```solidity
function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
```

## ISyrupToken

### convertToExitAssets

```solidity
function convertToExitAssets(uint256 shares) external view returns (uint256)
```

## SyrupChainlinkAdapter

example https://etherscan.io/address/0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b

### constructor

```solidity
constructor(address _syrupToken) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## IWrappedEEth

### getRate

```solidity
function getRate() external view returns (uint256)
```

## WrappedEEthChainlinkAdapter

example https://etherscan.io/address/0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee

### wrappedEEth

```solidity
contract IWrappedEEth wrappedEEth
```

### constructor

```solidity
constructor(address _wrappedEEth) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## IWstEth

### stEthPerToken

```solidity
function stEthPerToken() external view returns (uint256)
```

## WstEthChainlinkAdapter

example https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0

### wstEth

```solidity
contract IWstEth wstEth
```

### constructor

```solidity
constructor(address _wstEth) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## IYInjOracle

### getExchangeRate

```solidity
function getExchangeRate() external view returns (uint256)
```

## YInjChainlinkAdapter

Adapter for yINJ from injective for sLINJ redemptions

### yInj

```solidity
contract IYInjOracle yInj
```

### constructor

```solidity
constructor(address _yINJ) public
```

### description

```solidity
function description() external pure returns (string)
```

### latestAnswer

```solidity
function latestAnswer() public view returns (int256)
```

## MidasLzMintBurnOFTAdapter

OFT MintBurn adapter implementation

### SenderNotThis

```solidity
error SenderNotThis(address sender)
```

error thrown when the sender is not the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | the address of the sender |

### onlyThis

```solidity
modifier onlyThis()
```

modifier to check if the sender is the contract itself

### constructor

```solidity
constructor(address _token, address _lzEndpoint, address _delegate, struct RateLimiter.RateLimitConfig[] _rateLimitConfigs) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | address of the mToken |
| _lzEndpoint | address | address of the LayerZero endpoint |
| _delegate | address | address of the delegate |
| _rateLimitConfigs | struct RateLimiter.RateLimitConfig[] |  |

### burn

```solidity
function burn(address _from, uint256 _amount) external returns (bool)
```

Burns tokens from a specified account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | Address from which tokens will be burned |
| _amount | uint256 | Amount of tokens to be burned |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool |  |

### mint

```solidity
function mint(address _to, uint256 _amount) external returns (bool)
```

Mints tokens to a specified account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address | Address to which tokens will be minted |
| _amount | uint256 | Amount of tokens to be minted |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool |  |

### setRateLimits

```solidity
function setRateLimits(struct RateLimiter.RateLimitConfig[] _rateLimitConfigs) external
```

Sets the rate limits for the adapter

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _rateLimitConfigs | struct RateLimiter.RateLimitConfig[] | the rate limit configs to set |

### getRateLimit

```solidity
function getRateLimit(uint32 _dstEid) external view returns (struct RateLimiter.RateLimit)
```

Returns the rate limit for a given destination EID

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dstEid | uint32 | the destination EID |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct RateLimiter.RateLimit | the rate limit struct |

### sharedDecimals

```solidity
function sharedDecimals() public pure returns (uint8)
```

Returns the shared decimals for the adapter

_Overridden to 9 because default is not enough for
some of the mTokens_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The shared decimals |

### _debit

```solidity
function _debit(address _from, uint256 _amountLD, uint256 _minAmountLD, uint32 _dstEid) internal returns (uint256 amountSentLD, uint256 amountReceivedLD)
```

Burns tokens from the sender's balance to prepare for sending.

_WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, i.e., 1 token in, 1 token out.
     If the 'innerToken' applies something like a transfer fee, the default will NOT work.
     A pre/post balance check will need to be done to calculate the amountReceivedLD._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _from | address | The address to debit the tokens from. |
| _amountLD | uint256 | The amount of tokens to send in local decimals. |
| _minAmountLD | uint256 | The minimum amount to send in local decimals. |
| _dstEid | uint32 | The destination chain ID. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountSentLD | uint256 | The amount sent in local decimals. |
| amountReceivedLD | uint256 | The amount received in local decimals on the remote. |

## MidasLzOFT

OFT adapter implementation

### constructor

```solidity
constructor(string _name, string _symbol, uint8 __sharedDecimals, address _lzEndpoint, address _delegate) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | name of the token |
| _symbol | string | symbol of the token |
| __sharedDecimals | uint8 | shared decimals for the OFT |
| _lzEndpoint | address | address of the LayerZero endpoint |
| _delegate | address | address of the delegate |

### sharedDecimals

```solidity
function sharedDecimals() public view returns (uint8)
```

Returns the shared decimals for the OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The shared decimals |

## MidasLzOFTAdapter

OFT adapter implementation

### constructor

```solidity
constructor(address _token, uint8 __sharedDecimals, address _lzEndpoint, address _delegate) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | address of the token |
| __sharedDecimals | uint8 | shared decimals for the OFT adapter |
| _lzEndpoint | address | address of the LayerZero endpoint |
| _delegate | address | address of the delegate |

### sharedDecimals

```solidity
function sharedDecimals() public view returns (uint8)
```

Returns the shared decimals for the OFT

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The shared decimals |

## AaveV3PoolMock

### reserveATokens

```solidity
mapping(address => address) reserveATokens
```

### withdrawReturnBps

```solidity
uint256 withdrawReturnBps
```

### shouldRevertSupply

```solidity
bool shouldRevertSupply
```

### setReserveAToken

```solidity
function setReserveAToken(address asset, address aToken) external
```

### setWithdrawReturnBps

```solidity
function setWithdrawReturnBps(uint256 bps) external
```

### withdraw

```solidity
function withdraw(address asset, uint256 amount, address to) external returns (uint256)
```

### setShouldRevertSupply

```solidity
function setShouldRevertSupply(bool _shouldRevert) external
```

### supply

```solidity
function supply(address asset, uint256 amount, address onBehalfOf, uint16) external
```

### withdrawAdmin

```solidity
function withdrawAdmin(address token, address to, uint256 amount) external
```

### getReserveAToken

```solidity
function getReserveAToken(address asset) external view returns (address)
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

## IERC20MintBurn

### mint

```solidity
function mint(address to, uint256 amount) external
```

### burn

```solidity
function burn(address from, uint256 amount) external
```

## AxelarInterchainTokenServiceMock

### registeredTokenAddresses

```solidity
mapping(bytes32 => address) registeredTokenAddresses
```

### mintBurn

```solidity
mapping(bytes32 => bool) mintBurn
```

### shouldRevert

```solidity
bool shouldRevert
```

### chainNameHash

```solidity
bytes32 chainNameHash
```

### setChainNameHash

```solidity
function setChainNameHash(bytes32 _chainNameHash) external
```

### setShouldRevert

```solidity
function setShouldRevert(bool _shouldRevert) external
```

### registerToken

```solidity
function registerToken(bytes32 tokenId, address tokenAddress, bool _mintBurn) external
```

### interchainTransfer

```solidity
function interchainTransfer(bytes32 tokenId, string, bytes destinationAddressBytes, uint256 amount, bytes, uint256) external payable
```

### callContractWithInterchainToken

```solidity
function callContractWithInterchainToken(bytes32 tokenId, string destinationChain, bytes destinationAddress, uint256 amount, bytes data) external payable
```

### registeredTokenAddress

```solidity
function registeredTokenAddress(bytes32 tokenId) external view returns (address tokenAddress)
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

### burn

```solidity
function burn(address from, uint256 amount) external
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

## LzEndpointV2Mock

### EMPTY_PAYLOAD_HASH

```solidity
bytes32 EMPTY_PAYLOAD_HASH
```

### eid

```solidity
uint32 eid
```

### lzEndpointLookup

```solidity
mapping(address => address) lzEndpointLookup
```

### readResponseLookup

```solidity
mapping(address => bytes) readResponseLookup
```

### readChannelId

```solidity
uint32 readChannelId
```

### lazyInboundNonce

```solidity
mapping(address => mapping(uint32 => mapping(bytes32 => uint64))) lazyInboundNonce
```

### inboundPayloadHash

```solidity
mapping(address => mapping(uint32 => mapping(bytes32 => mapping(uint64 => bytes32)))) inboundPayloadHash
```

### outboundNonce

```solidity
mapping(address => mapping(uint32 => mapping(bytes32 => uint64))) outboundNonce
```

### nextComposerMsgValue

```solidity
uint256 nextComposerMsgValue
```

### relayerFeeConfig

```solidity
struct LzEndpointV2Mock.RelayerFeeConfig relayerFeeConfig
```

### protocolFeeConfig

```solidity
struct LzEndpointV2Mock.ProtocolFeeConfig protocolFeeConfig
```

### verifierFee

```solidity
uint256 verifierFee
```

### ProtocolFeeConfig

```solidity
struct ProtocolFeeConfig {
  uint256 zroFee;
  uint256 nativeBP;
}
```

### RelayerFeeConfig

```solidity
struct RelayerFeeConfig {
  uint128 dstPriceRatio;
  uint128 dstGasPriceInWei;
  uint128 dstNativeAmtCap;
  uint64 baseGas;
  uint64 gasPerByte;
}
```

### _NOT_ENTERED

```solidity
uint8 _NOT_ENTERED
```

### _ENTERED

```solidity
uint8 _ENTERED
```

### _receive_entered_state

```solidity
uint8 _receive_entered_state
```

### receiveNonReentrant

```solidity
modifier receiveNonReentrant()
```

### ValueTransferFailed

```solidity
event ValueTransferFailed(address to, uint256 quantity)
```

### constructor

```solidity
constructor(uint32 _eid) public
```

### send

```solidity
function send(struct MessagingParams _params, address _refundAddress) public payable returns (struct MessagingReceipt receipt)
```

### receivePayload

```solidity
function receivePayload(struct Origin _origin, address _receiver, bytes32 _payloadHash, bytes _message, uint256 _gas, uint256 _msgValue, bytes32 _guid) external payable
```

### getExecutorFee

```solidity
function getExecutorFee(uint256 _payloadSize, bytes _options) public view returns (uint256)
```

### _quote

```solidity
function _quote(struct MessagingParams _params, address) internal view returns (struct MessagingFee messagingFee)
```

### _getTreasuryAndVerifierFees

```solidity
function _getTreasuryAndVerifierFees(uint256 _executorFee, uint256 _verifierFee) internal view returns (uint256)
```

### _outbound

```solidity
function _outbound(address _sender, uint32 _dstEid, bytes32 _receiver) internal returns (uint64 nonce)
```

### setDestLzEndpoint

```solidity
function setDestLzEndpoint(address destAddr, address lzEndpointAddr) external
```

### setReadResponse

```solidity
function setReadResponse(address destAddr, bytes resolvedPayload) external
```

### setReadChannelId

```solidity
function setReadChannelId(uint32 _readChannelId) external
```

### _decodeExecutorOptions

```solidity
function _decodeExecutorOptions(bytes _options) internal view returns (uint256 dstAmount, uint256 totalGas)
```

### splitOptions

```solidity
function splitOptions(bytes _options) internal pure returns (bytes, struct WorkerOptions[])
```

### decode

```solidity
function decode(bytes _options) internal pure returns (bytes executorOptions, bytes dvnOptions)
```

### decodeLegacyOptions

```solidity
function decodeLegacyOptions(uint16 _optionType, bytes _options) internal pure returns (bytes executorOptions)
```

### burn

```solidity
function burn(address _oapp, uint32 _srcEid, bytes32 _sender, uint64 _nonce, bytes32 _payloadHash) external
```

### clear

```solidity
function clear(address _oapp, struct Origin _origin, bytes32 _guid, bytes _message) external
```

### composeQueue

```solidity
mapping(address => mapping(address => mapping(bytes32 => mapping(uint16 => bytes32)))) composeQueue
```

### defaultReceiveLibrary

```solidity
function defaultReceiveLibrary(uint32) external pure returns (address)
```

### defaultReceiveLibraryTimeout

```solidity
function defaultReceiveLibraryTimeout(uint32) external pure returns (address lib, uint256 expiry)
```

### defaultSendLibrary

```solidity
function defaultSendLibrary(uint32) external pure returns (address)
```

### executable

```solidity
function executable(struct Origin, address) external pure returns (enum ExecutionState)
```

### getConfig

```solidity
function getConfig(address, address, uint32, uint32) external pure returns (bytes config)
```

### getReceiveLibrary

```solidity
function getReceiveLibrary(address, uint32) external pure returns (address lib, bool isDefault)
```

### getRegisteredLibraries

```solidity
function getRegisteredLibraries() external pure returns (address[])
```

### getSendLibrary

```solidity
function getSendLibrary(address, uint32) external pure returns (address lib)
```

### inboundNonce

```solidity
function inboundNonce(address _receiver, uint32 _srcEid, bytes32 _sender) external view returns (uint64)
```

### isDefaultSendLibrary

```solidity
function isDefaultSendLibrary(address, uint32) external pure returns (bool)
```

### isRegisteredLibrary

```solidity
function isRegisteredLibrary(address) external pure returns (bool)
```

### isSupportedEid

```solidity
function isSupportedEid(uint32) external pure returns (bool)
```

### lzCompose

```solidity
function lzCompose(address, address, bytes32, uint16, bytes, bytes) external payable
```

### lzReceive

```solidity
function lzReceive(struct Origin, address, bytes32, bytes, bytes) external payable
```

### lzToken

```solidity
function lzToken() external pure returns (address)
```

### nativeToken

```solidity
function nativeToken() external pure returns (address)
```

### nextGuid

```solidity
function nextGuid(address, uint32, bytes32) external pure returns (bytes32)
```

### nilify

```solidity
function nilify(address, uint32, bytes32, uint64, bytes32) external
```

### quote

```solidity
function quote(struct MessagingParams _params, address _sender) external view returns (struct MessagingFee)
```

### receiveLibraryTimeout

```solidity
mapping(address => mapping(uint32 => struct IMessageLibManager.Timeout)) receiveLibraryTimeout
```

### registerLibrary

```solidity
function registerLibrary(address) public
```

### setNextComposerMsgValue

```solidity
function setNextComposerMsgValue() external payable
```

### sendCompose

```solidity
function sendCompose(address to, bytes32 guid, uint16, bytes message) external
```

### setConfig

```solidity
function setConfig(address, address, struct SetConfigParam[]) external
```

### setDefaultReceiveLibrary

```solidity
function setDefaultReceiveLibrary(uint32, address, uint256) external
```

### setDefaultReceiveLibraryTimeout

```solidity
function setDefaultReceiveLibraryTimeout(uint32, address, uint256) external
```

### setDefaultSendLibrary

```solidity
function setDefaultSendLibrary(uint32, address) external
```

### setDelegate

```solidity
function setDelegate(address) external
```

### setLzToken

```solidity
function setLzToken(address) external
```

### setReceiveLibrary

```solidity
function setReceiveLibrary(address, uint32, address, uint256) external
```

### setReceiveLibraryTimeout

```solidity
function setReceiveLibraryTimeout(address, uint32, address, uint256) external
```

### setSendLibrary

```solidity
function setSendLibrary(address, uint32, address) external
```

### skip

```solidity
function skip(address, uint32, bytes32, uint64) external
```

### verifiable

```solidity
function verifiable(struct Origin, address, address, bytes32) external pure returns (bool)
```

### verify

```solidity
function verify(struct Origin, address, bytes32) external
```

### executeNativeAirDropAndReturnLzGas

```solidity
function executeNativeAirDropAndReturnLzGas(bytes _options) public returns (uint256 totalGas, uint256 dstAmount)
```

### _executeNativeAirDropAndReturnLzGas

```solidity
function _executeNativeAirDropAndReturnLzGas(bytes _options) public returns (uint256 totalGas, uint256 dstAmount)
```

### _initializable

```solidity
function _initializable(struct Origin _origin, address _receiver, uint64 _lazyInboundNonce) internal view returns (bool)
```

### _verifiable

```solidity
function _verifiable(struct Origin _origin, address _receiver, uint64 _lazyInboundNonce) internal view returns (bool)
```

_bytes(0) payloadHash can never be submitted_

### initializable

```solidity
function initializable(struct Origin _origin, address _receiver) external view returns (bool)
```

### verifiable

```solidity
function verifiable(struct Origin _origin, address _receiver) external view returns (bool)
```

### isValidReceiveLibrary

```solidity
function isValidReceiveLibrary(address _receiver, uint32 _srcEid, address _actualReceiveLib) public view returns (bool)
```

_called when the endpoint checks if the msgLib attempting to verify the msg is the configured msgLib of the Oapp
this check provides the ability for Oapp to lock in a trusted msgLib
it will fist check if the msgLib is the currently configured one. then check if the msgLib is the one in grace period of msgLib versioning upgrade_

### fallback

```solidity
fallback() external payable
```

### receive

```solidity
receive() external payable
```

## MorphoVaultMock

### underlyingAsset

```solidity
address underlyingAsset
```

### exchangeRateNumerator

```solidity
uint256 exchangeRateNumerator
```

### RATE_PRECISION

```solidity
uint256 RATE_PRECISION
```

### shouldRevertDeposit

```solidity
bool shouldRevertDeposit
```

### constructor

```solidity
constructor(address _underlyingAsset) public
```

### mint

```solidity
function mint(address to, uint256 amount) external
```

### setExchangeRate

```solidity
function setExchangeRate(uint256 _numerator) external
```

### setShouldRevertDeposit

```solidity
function setShouldRevertDeposit(bool _shouldRevert) external
```

### withdrawAdmin

```solidity
function withdrawAdmin(address token, address to, uint256 amount) external
```

### asset

```solidity
function asset() external view returns (address)
```

### deposit

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
```

### previewDeposit

```solidity
function previewDeposit(uint256 assets) public view returns (uint256 shares)
```

### redeem

```solidity
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
```

### withdraw

```solidity
function withdraw(uint256 assets, address receiver, address owner) public returns (uint256 shares)
```

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) public view returns (uint256 shares)
```

### convertToAssets

```solidity
function convertToAssets(uint256 shares) public view returns (uint256 assets)
```

## SanctionsListMock

### isSanctioned

```solidity
mapping(address => bool) isSanctioned
```

### setSanctioned

```solidity
function setSanctioned(address addr, bool sanctioned) external
```

## USTBMock

### owner

```solidity
address owner
```

### constructor

```solidity
constructor() public
```

### symbol

```solidity
function symbol() public view returns (string)
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

### mint

```solidity
function mint(address to, uint256 amount) external
```

### subscribe

```solidity
function subscribe(address to, uint256 inAmount, address stablecoin) public
```

### subscribe

```solidity
function subscribe(uint256 inAmount, address stablecoin) external
```

### setStablecoinConfig

```solidity
function setStablecoinConfig(address stablecoin, address newSweepDestination, uint96 newFee) external
```

### setAllowListV2

```solidity
function setAllowListV2(address allowListV2_) external
```

### setIsAllowed

```solidity
function setIsAllowed(address addr, bool isAllowed_) external
```

### _subscribe

```solidity
function _subscribe(address to, uint256 inAmount, address stablecoin) internal
```

_mints ustb 1:1 to inAmount_

### supportedStablecoins

```solidity
function supportedStablecoins(address stablecoin) public view returns (struct ISuperstateToken.StablecoinConfig)
```

### allowListV2

```solidity
function allowListV2() external view returns (address)
```

### isAllowed

```solidity
function isAllowed(address addr) external view returns (bool)
```

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

## YInjOracleMock

### constructor

```solidity
constructor(uint256 _rate) public
```

### getExchangeRate

```solidity
function getExchangeRate() external view returns (uint256)
```

## JIV

### JIV_MINT_OPERATOR_ROLE

```solidity
bytes32 JIV_MINT_OPERATOR_ROLE
```

actor that can mint JIV

### JIV_BURN_OPERATOR_ROLE

```solidity
bytes32 JIV_BURN_OPERATOR_ROLE
```

actor that can burn JIV

### JIV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 JIV_PAUSE_OPERATOR_ROLE
```

actor that can pause JIV

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint JIV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn JIV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause JIV token_

## JivCustomAggregatorFeed

AggregatorV3 compatible feed for JIV,
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

## JivDataFeed

DataFeed for JIV product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## AcreMBtc1CustomAggregatorFeed

AggregatorV3 compatible feed for acremBTC1,
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

## AcreMBtc1DataFeed

DataFeed for acremBTC1 product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## acremBTC1

### ACRE_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 ACRE_BTC_MINT_OPERATOR_ROLE
```

actor that can mint acremBTC1

### ACRE_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 ACRE_BTC_BURN_OPERATOR_ROLE
```

actor that can burn acremBTC1

### ACRE_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 ACRE_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause acremBTC1

### name

```solidity
function name() public pure returns (string _name)
```

_override to return a new name (not the initial one)_

### symbol

```solidity
function symbol() public pure returns (string _symbol)
```

_override to return a new symbol (not the initial one)_

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint acremBTC1 token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn acremBTC1 token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause acremBTC1 token_

## CUsdoCustomAggregatorFeed

AggregatorV3 compatible feed for cUSDO,
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

## CUsdoDataFeed

DataFeed for cUSDO product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## cUSDO

### C_USDO_MINT_OPERATOR_ROLE

```solidity
bytes32 C_USDO_MINT_OPERATOR_ROLE
```

actor that can mint cUSDO

### C_USDO_BURN_OPERATOR_ROLE

```solidity
bytes32 C_USDO_BURN_OPERATOR_ROLE
```

actor that can burn cUSDO

### C_USDO_PAUSE_OPERATOR_ROLE

```solidity
bytes32 C_USDO_PAUSE_OPERATOR_ROLE
```

actor that can pause cUSDO

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint cUSDO token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn cUSDO token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause cUSDO token_

## DnEthCustomAggregatorFeed

AggregatorV3 compatible feed for dnETH,
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

## DnEthDataFeed

DataFeed for dnETH product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## dnETH

### DN_ETH_MINT_OPERATOR_ROLE

```solidity
bytes32 DN_ETH_MINT_OPERATOR_ROLE
```

actor that can mint dnETH

### DN_ETH_BURN_OPERATOR_ROLE

```solidity
bytes32 DN_ETH_BURN_OPERATOR_ROLE
```

actor that can burn dnETH

### DN_ETH_PAUSE_OPERATOR_ROLE

```solidity
bytes32 DN_ETH_PAUSE_OPERATOR_ROLE
```

actor that can pause dnETH

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint dnETH token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn dnETH token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause dnETH token_

## DnFartCustomAggregatorFeed

AggregatorV3 compatible feed for dnFART,
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

## DnFartDataFeed

DataFeed for dnFART product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## dnFART

### DN_FART_MINT_OPERATOR_ROLE

```solidity
bytes32 DN_FART_MINT_OPERATOR_ROLE
```

actor that can mint dnFART

### DN_FART_BURN_OPERATOR_ROLE

```solidity
bytes32 DN_FART_BURN_OPERATOR_ROLE
```

actor that can burn dnFART

### DN_FART_PAUSE_OPERATOR_ROLE

```solidity
bytes32 DN_FART_PAUSE_OPERATOR_ROLE
```

actor that can pause dnFART

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint dnFART token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn dnFART token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause dnFART token_

## DnHypeCustomAggregatorFeed

AggregatorV3 compatible feed for dnHYPE,
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

## DnHypeDataFeed

DataFeed for dnHYPE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## dnHYPE

### DN_HYPE_MINT_OPERATOR_ROLE

```solidity
bytes32 DN_HYPE_MINT_OPERATOR_ROLE
```

actor that can mint dnHYPE

### DN_HYPE_BURN_OPERATOR_ROLE

```solidity
bytes32 DN_HYPE_BURN_OPERATOR_ROLE
```

actor that can burn dnHYPE

### DN_HYPE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 DN_HYPE_PAUSE_OPERATOR_ROLE
```

actor that can pause dnHYPE

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint dnHYPE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn dnHYPE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause dnHYPE token_

## DnPumpCustomAggregatorFeed

AggregatorV3 compatible feed for dnPUMP,
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

## DnPumpDataFeed

DataFeed for dnPUMP product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## dnPUMP

### DN_PUMP_MINT_OPERATOR_ROLE

```solidity
bytes32 DN_PUMP_MINT_OPERATOR_ROLE
```

actor that can mint dnPUMP

### DN_PUMP_BURN_OPERATOR_ROLE

```solidity
bytes32 DN_PUMP_BURN_OPERATOR_ROLE
```

actor that can burn dnPUMP

### DN_PUMP_PAUSE_OPERATOR_ROLE

```solidity
bytes32 DN_PUMP_PAUSE_OPERATOR_ROLE
```

actor that can pause dnPUMP

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint dnPUMP token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn dnPUMP token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause dnPUMP token_

## DnTestCustomAggregatorFeedGrowth

AggregatorV3 compatible feed for dnTEST,
where price is submitted manually by feed admins,
and growth apr applies to the answer.

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## DnTestDataFeed

DataFeed for dnTEST product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## dnTEST

### DN_TEST_MINT_OPERATOR_ROLE

```solidity
bytes32 DN_TEST_MINT_OPERATOR_ROLE
```

actor that can mint dnTEST

### DN_TEST_BURN_OPERATOR_ROLE

```solidity
bytes32 DN_TEST_BURN_OPERATOR_ROLE
```

actor that can burn dnTEST

### DN_TEST_PAUSE_OPERATOR_ROLE

```solidity
bytes32 DN_TEST_PAUSE_OPERATOR_ROLE
```

actor that can pause dnTEST

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint dnTEST token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn dnTEST token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause dnTEST token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## HBUsdcCustomAggregatorFeed

AggregatorV3 compatible feed for hbUSDC,
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

## HBUsdcDataFeed

DataFeed for hbUSDC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## hbUSDC

### HB_USDC_MINT_OPERATOR_ROLE

```solidity
bytes32 HB_USDC_MINT_OPERATOR_ROLE
```

actor that can mint hbUSDC

### HB_USDC_BURN_OPERATOR_ROLE

```solidity
bytes32 HB_USDC_BURN_OPERATOR_ROLE
```

actor that can burn hbUSDC

### HB_USDC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 HB_USDC_PAUSE_OPERATOR_ROLE
```

actor that can pause hbUSDC

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint hbUSDC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn hbUSDC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause hbUSDC token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## KitBtcCustomAggregatorFeed

AggregatorV3 compatible feed for kitBTC,
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

## KitBtcDataFeed

DataFeed for kitBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## kitBTC

### KIT_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 KIT_BTC_MINT_OPERATOR_ROLE
```

actor that can mint kitBTC

### KIT_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 KIT_BTC_BURN_OPERATOR_ROLE
```

actor that can burn kitBTC

### KIT_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 KIT_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause kitBTC

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint kitBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn kitBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause kitBTC token_

## KitHypeCustomAggregatorFeed

AggregatorV3 compatible feed for kitHYPE,
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

## KitHypeDataFeed

DataFeed for kitHYPE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## kitHYPE

### KIT_HYPE_MINT_OPERATOR_ROLE

```solidity
bytes32 KIT_HYPE_MINT_OPERATOR_ROLE
```

actor that can mint kitHYPE

### KIT_HYPE_BURN_OPERATOR_ROLE

```solidity
bytes32 KIT_HYPE_BURN_OPERATOR_ROLE
```

actor that can burn kitHYPE

### KIT_HYPE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 KIT_HYPE_PAUSE_OPERATOR_ROLE
```

actor that can pause kitHYPE

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint kitHYPE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn kitHYPE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause kitHYPE token_

## KitUsdCustomAggregatorFeed

AggregatorV3 compatible feed for kitUSD,
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

## KitUsdDataFeed

DataFeed for kitUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## kitUSD

### KIT_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 KIT_USD_MINT_OPERATOR_ROLE
```

actor that can mint kitUSD

### KIT_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 KIT_USD_BURN_OPERATOR_ROLE
```

actor that can burn kitUSD

### KIT_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 KIT_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause kitUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint kitUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn kitUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause kitUSD token_

## KmiUsdCustomAggregatorFeed

AggregatorV3 compatible feed for kmiUSD,
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

## KmiUsdDataFeed

DataFeed for kmiUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## kmiUSD

### KMI_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 KMI_USD_MINT_OPERATOR_ROLE
```

actor that can mint kmiUSD

### KMI_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 KMI_USD_BURN_OPERATOR_ROLE
```

actor that can burn kmiUSD

### KMI_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 KMI_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause kmiUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint kmiUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn kmiUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause kmiUSD token_

## LiquidHypeCustomAggregatorFeed

AggregatorV3 compatible feed for liquidHYPE,
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

## LiquidHypeDataFeed

DataFeed for liquidHYPE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## liquidHYPE

### LIQUID_HYPE_MINT_OPERATOR_ROLE

```solidity
bytes32 LIQUID_HYPE_MINT_OPERATOR_ROLE
```

actor that can mint liquidHYPE

### LIQUID_HYPE_BURN_OPERATOR_ROLE

```solidity
bytes32 LIQUID_HYPE_BURN_OPERATOR_ROLE
```

actor that can burn liquidHYPE

### LIQUID_HYPE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 LIQUID_HYPE_PAUSE_OPERATOR_ROLE
```

actor that can pause liquidHYPE

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint liquidHYPE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn liquidHYPE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause liquidHYPE token_

## LiquidReserveCustomAggregatorFeed

AggregatorV3 compatible feed for liquidRESERVE,
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

## LiquidReserveDataFeed

DataFeed for liquidRESERVE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## liquidRESERVE

### LIQUID_RESERVE_MINT_OPERATOR_ROLE

```solidity
bytes32 LIQUID_RESERVE_MINT_OPERATOR_ROLE
```

actor that can mint liquidRESERVE

### LIQUID_RESERVE_BURN_OPERATOR_ROLE

```solidity
bytes32 LIQUID_RESERVE_BURN_OPERATOR_ROLE
```

actor that can burn liquidRESERVE

### LIQUID_RESERVE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 LIQUID_RESERVE_PAUSE_OPERATOR_ROLE
```

actor that can pause liquidRESERVE

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint liquidRESERVE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn liquidRESERVE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause liquidRESERVE token_

## LstHypeCustomAggregatorFeed

AggregatorV3 compatible feed for lstHYPE,
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

## LstHypeDataFeed

DataFeed for lstHYPE product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## lstHYPE

### LST_HYPE_MINT_OPERATOR_ROLE

```solidity
bytes32 LST_HYPE_MINT_OPERATOR_ROLE
```

actor that can mint lstHYPE

### LST_HYPE_BURN_OPERATOR_ROLE

```solidity
bytes32 LST_HYPE_BURN_OPERATOR_ROLE
```

actor that can burn lstHYPE

### LST_HYPE_PAUSE_OPERATOR_ROLE

```solidity
bytes32 LST_HYPE_PAUSE_OPERATOR_ROLE
```

actor that can pause lstHYPE

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint lstHYPE token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn lstHYPE token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause lstHYPE token_

## MApolloCustomAggregatorFeed

AggregatorV3 compatible feed for mAPOLLO,
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

## MApolloDataFeed

DataFeed for mAPOLLO product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mAPOLLO

### M_APOLLO_MINT_OPERATOR_ROLE

```solidity
bytes32 M_APOLLO_MINT_OPERATOR_ROLE
```

actor that can mint mAPOLLO

### M_APOLLO_BURN_OPERATOR_ROLE

```solidity
bytes32 M_APOLLO_BURN_OPERATOR_ROLE
```

actor that can burn mAPOLLO

### M_APOLLO_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_APOLLO_PAUSE_OPERATOR_ROLE
```

actor that can pause mAPOLLO

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mAPOLLO token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mAPOLLO token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mAPOLLO token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MEvUsdCustomAggregatorFeed

AggregatorV3 compatible feed for mEVUSD,
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

## MEvUsdDataFeed

DataFeed for mEVUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mEVUSD

### M_EV_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 M_EV_USD_MINT_OPERATOR_ROLE
```

actor that can mint mEVUSD

### M_EV_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 M_EV_USD_BURN_OPERATOR_ROLE
```

actor that can burn mEVUSD

### M_EV_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_EV_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause mEVUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mEVUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mEVUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mEVUSD token_

## MFarmCustomAggregatorFeed

AggregatorV3 compatible feed for mFARM,
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

## MFarmDataFeed

DataFeed for mFARM product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mFARM

### M_FARM_MINT_OPERATOR_ROLE

```solidity
bytes32 M_FARM_MINT_OPERATOR_ROLE
```

actor that can mint mFARM

### M_FARM_BURN_OPERATOR_ROLE

```solidity
bytes32 M_FARM_BURN_OPERATOR_ROLE
```

actor that can burn mFARM

### M_FARM_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_FARM_PAUSE_OPERATOR_ROLE
```

actor that can pause mFARM

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mFARM token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mFARM token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mFARM token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MHyperCustomAggregatorFeed

AggregatorV3 compatible feed for mHYPER,
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

## MHyperDataFeed

DataFeed for mHYPER product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mHYPER

### M_HYPER_MINT_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_MINT_OPERATOR_ROLE
```

actor that can mint mHYPER

### M_HYPER_BURN_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_BURN_OPERATOR_ROLE
```

actor that can burn mHYPER

### M_HYPER_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_PAUSE_OPERATOR_ROLE
```

actor that can pause mHYPER

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mHYPER token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mHYPER token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mHYPER token_

## MHyperBtcCustomAggregatorFeed

AggregatorV3 compatible feed for mHyperBTC,
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

## MHyperBtcDataFeed

DataFeed for mHyperBTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mHyperBTC

### M_HYPER_BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_BTC_MINT_OPERATOR_ROLE
```

actor that can mint mHyperBTC

### M_HYPER_BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_BTC_BURN_OPERATOR_ROLE
```

actor that can burn mHyperBTC

### M_HYPER_BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause mHyperBTC

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mHyperBTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mHyperBTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mHyperBTC token_

## MHyperEthCustomAggregatorFeed

AggregatorV3 compatible feed for mHyperETH,
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

## MHyperEthDataFeed

DataFeed for mHyperETH product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mHyperETH

### M_HYPER_ETH_MINT_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_ETH_MINT_OPERATOR_ROLE
```

actor that can mint mHyperETH

### M_HYPER_ETH_BURN_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_ETH_BURN_OPERATOR_ROLE
```

actor that can burn mHyperETH

### M_HYPER_ETH_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_HYPER_ETH_PAUSE_OPERATOR_ROLE
```

actor that can pause mHyperETH

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mHyperETH token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mHyperETH token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mHyperETH token_

## MKRalphaCustomAggregatorFeed

AggregatorV3 compatible feed for mKRalpha,
where price is submitted manually by feed admins

### initialize

```solidity
function initialize(address _accessControl, int192 _minAnswer, int192 _maxAnswer, uint256 _maxAnswerDeviation, string _description) public
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

### initializeV2

```solidity
function initializeV2(uint256 _newMaxAnswerDeviation) public
```

initializes the contract with a new max answer deviation

_increases contract version to 2_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newMaxAnswerDeviation | uint256 | new max answer deviation |

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can update prices in this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## MKRalphaDataFeed

DataFeed for mKRalpha product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mKRalpha

### M_KRALPHA_MINT_OPERATOR_ROLE

```solidity
bytes32 M_KRALPHA_MINT_OPERATOR_ROLE
```

actor that can mint mKRalpha

### M_KRALPHA_BURN_OPERATOR_ROLE

```solidity
bytes32 M_KRALPHA_BURN_OPERATOR_ROLE
```

actor that can burn mKRalpha

### M_KRALPHA_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_KRALPHA_PAUSE_OPERATOR_ROLE
```

actor that can pause mKRalpha

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mKRalpha token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mKRalpha token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mKRalpha token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MM1UsdCustomAggregatorFeed

AggregatorV3 compatible feed for mM1USD,
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

## MM1UsdDataFeed

DataFeed for mM1USD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mM1USD

### M_M1_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 M_M1_USD_MINT_OPERATOR_ROLE
```

actor that can mint mM1USD

### M_M1_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 M_M1_USD_BURN_OPERATOR_ROLE
```

actor that can burn mM1USD

### M_M1_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_M1_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause mM1USD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mM1USD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mM1USD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mM1USD token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MPortofinoCustomAggregatorFeed

AggregatorV3 compatible feed for mPortofino,
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

## MPortofinoDataFeed

DataFeed for mPortofino product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mPortofino

### M_PORTOFINO_MINT_OPERATOR_ROLE

```solidity
bytes32 M_PORTOFINO_MINT_OPERATOR_ROLE
```

actor that can mint mPortofino

### M_PORTOFINO_BURN_OPERATOR_ROLE

```solidity
bytes32 M_PORTOFINO_BURN_OPERATOR_ROLE
```

actor that can burn mPortofino

### M_PORTOFINO_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_PORTOFINO_PAUSE_OPERATOR_ROLE
```

actor that can pause mPortofino

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mPortofino token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mPortofino token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mPortofino token_

## MRe7CustomAggregatorFeed

AggregatorV3 compatible feed for mRE7,
where price is submitted manually by feed admins

### initialize

```solidity
function initialize(address _accessControl, int192 _minAnswer, int192 _maxAnswer, uint256 _maxAnswerDeviation, string _description) public
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

### initializeV3

```solidity
function initializeV3(uint256 _newMaxAnswerDeviation) public
```

initializes the contract with a new max answer deviation

_increases contract version to 3 (2 was already used)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newMaxAnswerDeviation | uint256 | new max answer deviation |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MRe7BtcCustomAggregatorFeed

AggregatorV3 compatible feed for mRE7BTC,
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

## MRe7BtcDataFeed

DataFeed for mRE7BTC product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mRE7BTC

### M_RE7BTC_MINT_OPERATOR_ROLE

```solidity
bytes32 M_RE7BTC_MINT_OPERATOR_ROLE
```

actor that can mint mRE7BTC

### M_RE7BTC_BURN_OPERATOR_ROLE

```solidity
bytes32 M_RE7BTC_BURN_OPERATOR_ROLE
```

actor that can burn mRE7BTC

### M_RE7BTC_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_RE7BTC_PAUSE_OPERATOR_ROLE
```

actor that can pause mRE7BTC

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mRE7BTC token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mRE7BTC token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mRE7BTC token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MRoxCustomAggregatorFeed

AggregatorV3 compatible feed for mROX,
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

## MRoxDataFeed

DataFeed for mROX product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mROX

### M_ROX_MINT_OPERATOR_ROLE

```solidity
bytes32 M_ROX_MINT_OPERATOR_ROLE
```

actor that can mint mROX

### M_ROX_BURN_OPERATOR_ROLE

```solidity
bytes32 M_ROX_BURN_OPERATOR_ROLE
```

actor that can burn mROX

### M_ROX_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_ROX_PAUSE_OPERATOR_ROLE
```

actor that can pause mROX

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mROX token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mROX token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mROX token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MTBillCustomAggregatorFeedGrowth

AggregatorV3 compatible feed for mTBILL,
where price is submitted manually by feed admins,
and growth apr applies to the answer.

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

DataFeed for mTBILL product

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

Base contract that stores all roles descriptors for mTBILL contracts

### M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE

```solidity
bytes32 M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE
```

actor that can manage MTBillCustomAggregatorFeed and MTBillDataFeed

## mTBILL

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mTBILL token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mTBILL token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mTBILL token_

## MTuCustomAggregatorFeed

AggregatorV3 compatible feed for mTU,
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

## MTuDataFeed

DataFeed for mTU product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mTU

### M_TU_MINT_OPERATOR_ROLE

```solidity
bytes32 M_TU_MINT_OPERATOR_ROLE
```

actor that can mint mTU

### M_TU_BURN_OPERATOR_ROLE

```solidity
bytes32 M_TU_BURN_OPERATOR_ROLE
```

actor that can burn mTU

### M_TU_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_TU_PAUSE_OPERATOR_ROLE
```

actor that can pause mTU

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mTU token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mTU token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mTU token_

## MWildUsdCustomAggregatorFeed

AggregatorV3 compatible feed for mWildUSD,
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

## MWildUsdDataFeed

DataFeed for mWildUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mWildUSD

### M_WILD_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 M_WILD_USD_MINT_OPERATOR_ROLE
```

actor that can mint mWildUSD

### M_WILD_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 M_WILD_USD_BURN_OPERATOR_ROLE
```

actor that can burn mWildUSD

### M_WILD_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_WILD_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause mWildUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mWildUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mWildUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mWildUSD token_

## MXrpCustomAggregatorFeed

AggregatorV3 compatible feed for mXRP,
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

## MXrpDataFeed

DataFeed for mXRP product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## mXRP

### M_XRP_MINT_OPERATOR_ROLE

```solidity
bytes32 M_XRP_MINT_OPERATOR_ROLE
```

actor that can mint mXRP

### M_XRP_BURN_OPERATOR_ROLE

```solidity
bytes32 M_XRP_BURN_OPERATOR_ROLE
```

actor that can burn mXRP

### M_XRP_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_XRP_PAUSE_OPERATOR_ROLE
```

actor that can pause mXRP

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mXRP token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mXRP token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mXRP token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## MSyrupUsdCustomAggregatorFeed

AggregatorV3 compatible feed for msyrupUSD,
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

## MSyrupUsdDataFeed

DataFeed for msyrupUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## msyrupUSD

### M_SYRUP_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USD_MINT_OPERATOR_ROLE
```

actor that can mint msyrupUSD

### M_SYRUP_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USD_BURN_OPERATOR_ROLE
```

actor that can burn msyrupUSD

### M_SYRUP_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause msyrupUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint msyrupUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn msyrupUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause msyrupUSD token_

## MSyrupUsdpCustomAggregatorFeed

AggregatorV3 compatible feed for msyrupUSDp,
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

## MSyrupUsdpDataFeed

DataFeed for msyrupUSDp product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## msyrupUSDp

### M_SYRUP_USDP_MINT_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USDP_MINT_OPERATOR_ROLE
```

actor that can mint msyrupUSDp

### M_SYRUP_USDP_BURN_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USDP_BURN_OPERATOR_ROLE
```

actor that can burn msyrupUSDp

### M_SYRUP_USDP_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_SYRUP_USDP_PAUSE_OPERATOR_ROLE
```

actor that can pause msyrupUSDp

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint msyrupUSDp token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn msyrupUSDp token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause msyrupUSDp token_

## ObeatUsdCustomAggregatorFeed

AggregatorV3 compatible feed for obeatUSD,
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

## ObeatUsdDataFeed

DataFeed for obeatUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## obeatUSD

### OBEAT_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 OBEAT_USD_MINT_OPERATOR_ROLE
```

actor that can mint obeatUSD

### OBEAT_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 OBEAT_USD_BURN_OPERATOR_ROLE
```

actor that can burn obeatUSD

### OBEAT_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 OBEAT_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause obeatUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint obeatUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn obeatUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause obeatUSD token_

## PlUsdCustomAggregatorFeed

AggregatorV3 compatible feed for plUSD,
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

## PlUsdDataFeed

DataFeed for plUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## plUSD

### PL_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 PL_USD_MINT_OPERATOR_ROLE
```

actor that can mint plUSD

### PL_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 PL_USD_BURN_OPERATOR_ROLE
```

actor that can burn plUSD

### PL_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 PL_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause plUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint plUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn plUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause plUSD token_

## SLInjCustomAggregatorFeed

AggregatorV3 compatible feed for sLINJ,
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

## SLInjDataFeed

DataFeed for sLINJ product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## sLINJ

### SL_INJ_MINT_OPERATOR_ROLE

```solidity
bytes32 SL_INJ_MINT_OPERATOR_ROLE
```

actor that can mint sLINJ

### SL_INJ_BURN_OPERATOR_ROLE

```solidity
bytes32 SL_INJ_BURN_OPERATOR_ROLE
```

actor that can burn sLINJ

### SL_INJ_PAUSE_OPERATOR_ROLE

```solidity
bytes32 SL_INJ_PAUSE_OPERATOR_ROLE
```

actor that can pause sLINJ

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint sLINJ token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn sLINJ token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause sLINJ token_

## SplUsdCustomAggregatorFeed

AggregatorV3 compatible feed for splUSD,
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

## SplUsdDataFeed

DataFeed for splUSD product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## splUSD

### SPL_USD_MINT_OPERATOR_ROLE

```solidity
bytes32 SPL_USD_MINT_OPERATOR_ROLE
```

actor that can mint splUSD

### SPL_USD_BURN_OPERATOR_ROLE

```solidity
bytes32 SPL_USD_BURN_OPERATOR_ROLE
```

actor that can burn splUSD

### SPL_USD_PAUSE_OPERATOR_ROLE

```solidity
bytes32 SPL_USD_PAUSE_OPERATOR_ROLE
```

actor that can pause splUSD

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint splUSD token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn splUSD token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause splUSD token_

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

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

## TacTonCustomAggregatorFeed

AggregatorV3 compatible feed for tacTON,
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

## TacTonDataFeed

DataFeed for tacTON product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## tacTON

### TAC_TON_MINT_OPERATOR_ROLE

```solidity
bytes32 TAC_TON_MINT_OPERATOR_ROLE
```

actor that can mint tacTON

### TAC_TON_BURN_OPERATOR_ROLE

```solidity
bytes32 TAC_TON_BURN_OPERATOR_ROLE
```

actor that can burn tacTON

### TAC_TON_PAUSE_OPERATOR_ROLE

```solidity
bytes32 TAC_TON_PAUSE_OPERATOR_ROLE
```

actor that can pause tacTON

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint tacTON token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn tacTON token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause tacTON token_

## WNlpCustomAggregatorFeed

AggregatorV3 compatible feed for wNLP,
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

## WNlpDataFeed

DataFeed for wNLP product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## wNLP

### W_NLP_MINT_OPERATOR_ROLE

```solidity
bytes32 W_NLP_MINT_OPERATOR_ROLE
```

actor that can mint wNLP

### W_NLP_BURN_OPERATOR_ROLE

```solidity
bytes32 W_NLP_BURN_OPERATOR_ROLE
```

actor that can burn wNLP

### W_NLP_PAUSE_OPERATOR_ROLE

```solidity
bytes32 W_NLP_PAUSE_OPERATOR_ROLE
```

actor that can pause wNLP

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint wNLP token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn wNLP token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause wNLP token_

## WVLPCustomAggregatorFeed

AggregatorV3 compatible feed for wVLP,
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

## WVLPDataFeed

DataFeed for wVLP product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## wVLP

### W_VLP_MINT_OPERATOR_ROLE

```solidity
bytes32 W_VLP_MINT_OPERATOR_ROLE
```

actor that can mint wVLP

### W_VLP_BURN_OPERATOR_ROLE

```solidity
bytes32 W_VLP_BURN_OPERATOR_ROLE
```

actor that can burn wVLP

### W_VLP_PAUSE_OPERATOR_ROLE

```solidity
bytes32 W_VLP_PAUSE_OPERATOR_ROLE
```

actor that can pause wVLP

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint wVLP token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn wVLP token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause wVLP token_

## WeEurCustomAggregatorFeed

AggregatorV3 compatible feed for weEUR,
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

## WeEurDataFeed

DataFeed for weEUR product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## weEUR

### WE_EUR_MINT_OPERATOR_ROLE

```solidity
bytes32 WE_EUR_MINT_OPERATOR_ROLE
```

actor that can mint weEUR

### WE_EUR_BURN_OPERATOR_ROLE

```solidity
bytes32 WE_EUR_BURN_OPERATOR_ROLE
```

actor that can burn weEUR

### WE_EUR_PAUSE_OPERATOR_ROLE

```solidity
bytes32 WE_EUR_PAUSE_OPERATOR_ROLE
```

actor that can pause weEUR

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint weEUR token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn weEUR token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause weEUR token_

## ZeroGBtcvCustomAggregatorFeed

AggregatorV3 compatible feed for zeroGBTCV,
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

## ZeroGBtcvDataFeed

DataFeed for zeroGBTCV product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## zeroGBTCV

### ZEROG_BTCV_MINT_OPERATOR_ROLE

```solidity
bytes32 ZEROG_BTCV_MINT_OPERATOR_ROLE
```

actor that can mint zeroGBTCV

### ZEROG_BTCV_BURN_OPERATOR_ROLE

```solidity
bytes32 ZEROG_BTCV_BURN_OPERATOR_ROLE
```

actor that can burn zeroGBTCV

### ZEROG_BTCV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 ZEROG_BTCV_PAUSE_OPERATOR_ROLE
```

actor that can pause zeroGBTCV

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint zeroGBTCV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn zeroGBTCV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause zeroGBTCV token_

## ZeroGEthvCustomAggregatorFeed

AggregatorV3 compatible feed for zeroGETHV,
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

## ZeroGEthvDataFeed

DataFeed for zeroGETHV product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## zeroGETHV

### ZEROG_ETHV_MINT_OPERATOR_ROLE

```solidity
bytes32 ZEROG_ETHV_MINT_OPERATOR_ROLE
```

actor that can mint zeroGETHV

### ZEROG_ETHV_BURN_OPERATOR_ROLE

```solidity
bytes32 ZEROG_ETHV_BURN_OPERATOR_ROLE
```

actor that can burn zeroGETHV

### ZEROG_ETHV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 ZEROG_ETHV_PAUSE_OPERATOR_ROLE
```

actor that can pause zeroGETHV

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint zeroGETHV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn zeroGETHV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause zeroGETHV token_

## ZeroGUsdvCustomAggregatorFeed

AggregatorV3 compatible feed for zeroGUSDV,
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

## ZeroGUsdvDataFeed

DataFeed for zeroGUSDV product

### feedAdminRole

```solidity
function feedAdminRole() public pure returns (bytes32)
```

_describes a role, owner of which can manage this feed_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role descriptor |

## zeroGUSDV

### ZEROG_USDV_MINT_OPERATOR_ROLE

```solidity
bytes32 ZEROG_USDV_MINT_OPERATOR_ROLE
```

actor that can mint zeroGUSDV

### ZEROG_USDV_BURN_OPERATOR_ROLE

```solidity
bytes32 ZEROG_USDV_BURN_OPERATOR_ROLE
```

actor that can burn zeroGUSDV

### ZEROG_USDV_PAUSE_OPERATOR_ROLE

```solidity
bytes32 ZEROG_USDV_PAUSE_OPERATOR_ROLE
```

actor that can pause zeroGUSDV

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint zeroGUSDV token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn zeroGUSDV token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause zeroGUSDV token_

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

## CompositeDataFeedTest

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

## CustomAggregatorV3CompatibleFeedGrowthTester

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

### setMaxAnswerDeviation

```solidity
function setMaxAnswerDeviation(uint256 _deviation) public
```

### getDeviation

```solidity
function getDeviation(int256 _lastPrice, int256 _newPrice, bool _validateOnlyUp) public pure returns (uint256)
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

### validateGreenlistableAdminAccess

```solidity
function validateGreenlistableAdminAccess(address account) external view
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

### _validateGreenlistableAdminAccess

```solidity
function _validateGreenlistableAdminAccess(address account) internal view
```

_checks that a given `account` has access to greenlistable functions_

### greenlistAdminRole

```solidity
function greenlistAdminRole() public view virtual returns (bytes32)
```

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
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(struct CommonVaultInitParams _commonVaultInitParams, struct CommonVaultV2InitParams _commonVaultV2InitParams) external
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

### _validatePauseAdminAccess

```solidity
function _validatePauseAdminAccess(address account) internal view
```

_validates that the caller has access to pause functions_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account address |

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
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

### _validateSanctionListAdminAccess

```solidity
function _validateSanctionListAdminAccess(address account) internal view
```

_validates that the caller has access to sanctions list functions_

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

## mTokenPermissionedTest

### M_TOKEN_TEST_MINT_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_MINT_OPERATOR_ROLE
```

### M_TOKEN_TEST_BURN_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_BURN_OPERATOR_ROLE
```

### M_TOKEN_TEST_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_PAUSE_OPERATOR_ROLE
```

### M_TOKEN_TEST_GREENLISTED_ROLE

```solidity
bytes32 M_TOKEN_TEST_GREENLISTED_ROLE
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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mToken token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mToken token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mToken token_

### _greenlistedRole

```solidity
function _greenlistedRole() internal pure returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## mTokenTest

### M_TOKEN_TEST_MINT_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_MINT_OPERATOR_ROLE
```

### M_TOKEN_TEST_BURN_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_BURN_OPERATOR_ROLE
```

### M_TOKEN_TEST_PAUSE_OPERATOR_ROLE

```solidity
bytes32 M_TOKEN_TEST_PAUSE_OPERATOR_ROLE
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

### _getNameSymbol

```solidity
function _getNameSymbol() internal pure returns (string, string)
```

_returns name and symbol of the token_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | name of the token |
| [1] | string | symbol of the token |

### _minterRole

```solidity
function _minterRole() internal pure returns (bytes32)
```

_AC role, owner of which can mint mToken token_

### _burnerRole

```solidity
function _burnerRole() internal pure returns (bytes32)
```

_AC role, owner of which can burn mToken token_

### _pauserRole

```solidity
function _pauserRole() internal pure returns (bytes32)
```

_AC role, owner of which can pause mToken token_

