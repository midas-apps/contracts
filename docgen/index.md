# Solidity API

## MidasInitializable

Base Initializable contract that implements constructor
that calls _disableInitializers() to prevent
initialization of implementation contract

### SenderNotProxyAdmin

```solidity
error SenderNotProxyAdmin()
```

error when the sender is not the proxy admin

### InvalidAddress

```solidity
error InvalidAddress(address addr)
```

error when the address is invalid

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| addr | address | address |

### onlyProxyAdmin

```solidity
modifier onlyProxyAdmin()
```

modifier to check if the sender is the proxy admin

### constructor

```solidity
constructor() internal
```

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view virtual
```

function to check if the sender is the proxy admin

## WithMidasAccessControl

Base contract that consumes MidasAccessControl

### _DEFAULT_ADMIN_ROLE

```solidity
bytes32 _DEFAULT_ADMIN_ROLE
```

admin role

### accessControl

```solidity
contract IMidasAccessControl accessControl
```

MidasAccessControl contract address

### SameBoolValue

```solidity
error SameBoolValue(bool value)
```

error when the value is the same as the previous value

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | bool | value |

### onlyRole

```solidity
modifier onlyRole(bytes32 role, bool validateFunctionRole)
```

_validates that the caller has the function role with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| validateFunctionRole | bool | whether to validate the function role |

### onlyRoleDelayOverride

```solidity
modifier onlyRoleDelayOverride(bytes32 role, uint32 overrideDelay, bool validateFunctionRole)
```

_validates that the caller has the function role with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| overrideDelay | uint32 | override delay for the invocation |
| validateFunctionRole | bool | whether to validate the function role |

### onlyRoleNoTimelock

```solidity
modifier onlyRoleNoTimelock(bytes32 role, bool validateFunctionRole)
```

_validates that the caller has the function role without timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| validateFunctionRole | bool |  |

### onlyContractAdmin

```solidity
modifier onlyContractAdmin()
```

_validates that the caller has the contract admin role or function operator role_

### __WithMidasAccessControl_init

```solidity
function __WithMidasAccessControl_init(address _accessControl) internal
```

_upgradeable pattern contract`s initializer_

### _validateFunctionAccessWithTimelock

```solidity
function _validateFunctionAccessWithTimelock(bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperator, address account, bool validateFunctionRole) internal view virtual
```

_validates that the function access is valid with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| overrideDelay | uint32 | override delay for the invocation |
| roleIsFunctionOperator | bool | whether the role is a function operator |
| account | address | account to validate |
| validateFunctionRole | bool | whether to validate the function role |

### _validateFunctionAccessWithoutTimelock

```solidity
function _validateFunctionAccessWithoutTimelock(bytes32 role, bool roleIsFunctionOperator, address account, bool validateFunctionRole) internal view
```

_validates that the function access is valid without timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| roleIsFunctionOperator | bool | whether the role is a function operator |
| account | address | account to validate |
| validateFunctionRole | bool | whether to validate the function role |

### contractAdminRole

```solidity
function contractAdminRole() public view virtual returns (bytes32)
```

_main admin role for the contract_

## CompositeDataFeed

A data feed contract that derives its price by computing the ratio
of two underlying data feeds (numerator ÷ denominator).

_Designed for cases where a synthetic or relative price is needed,
such as deriving cbBTC/BTC from cbBTC/USD and BTC/USD feeds._

### ChangeNumeratorFeed

```solidity
event ChangeNumeratorFeed(address _numeratorFeed)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _numeratorFeed | address | new IDataFeed contract address |

### ChangeDenominatorFeed

```solidity
event ChangeDenominatorFeed(address _denominatorFeed)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _denominatorFeed | address | new IDataFeed contract address |

### SetMinMaxExpectedAnswer

```solidity
event SetMinMaxExpectedAnswer(uint256 _maxExpectedAnswer, uint256 _minExpectedAnswer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | uint256 | new max expected answer |
| _minExpectedAnswer | uint256 | new min expected answer |

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

### constructor

```solidity
constructor(bytes32 _contractAdminRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |

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

### setMinMaxExpectedAnswer

```solidity
function setMinMaxExpectedAnswer(uint256 _maxExpectedAnswer, uint256 _minExpectedAnswer) external
```

updates `minExpectedAnswer` and `maxExpectedAnswer` values

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | uint256 | new max expected answer |
| _minExpectedAnswer | uint256 | new min expected answer |

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

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

## CompositeDataFeedMultiply

A data feed contract that derives its price by computing the product
of two underlying data feeds (numerator × denominator).

_Inherits from CompositeDataFeed and overrides only the calculation logic
to multiply instead of divide. Designed for cases where a synthetic or combined
price is needed, such as deriving mXRP/USD from mXRP/XRP and XRP/USD feeds._

### constructor

```solidity
constructor(bytes32 _contractAdminRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |

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

## DataFeed

Wrapper of ChainLink`s AggregatorV3 data feeds

### ChangeAggregator

```solidity
event ChangeAggregator(address _aggregator)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _aggregator | address | new AggregatorV3Interface contract address |

### SetHealthyDiff

```solidity
event SetHealthyDiff(uint256 _healthyDiff)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _healthyDiff | uint256 | new healthy diff value |

### SetMinMaxExpectedAnswer

```solidity
event SetMinMaxExpectedAnswer(int256 _maxExpectedAnswer, int256 _minExpectedAnswer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | int256 | new max expected answer |
| _minExpectedAnswer | int256 | new min expected answer |

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

### constructor

```solidity
constructor(bytes32 _contractAdminRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |

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

### setMinMaxExpectedAnswer

```solidity
function setMinMaxExpectedAnswer(int256 _maxExpectedAnswer, int256 _minExpectedAnswer) external
```

updates `minExpectedAnswer` and `maxExpectedAnswer` values

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxExpectedAnswer | int256 | new max expected answer |
| _minExpectedAnswer | int256 | new min expected answer |

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

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

## IMidasAccessControl

### SetUserFacingRoleParams

Set user facing role params

```solidity
struct SetUserFacingRoleParams {
  bytes32 role;
  bool enabled;
}
```

### SetGrantOperatorRoleParams

Set function access grant operator params

```solidity
struct SetGrantOperatorRoleParams {
  uint32 delay;
  bytes4 functionSelector;
  address operator;
  bool enabled;
}
```

### SetPermissionRoleParams

Set function permission params

```solidity
struct SetPermissionRoleParams {
  address account;
  bool enabled;
}
```

### GrantRoleMultParams

Grant role params

```solidity
struct GrantRoleMultParams {
  bytes32 role;
  address account;
  uint32 delay;
}
```

### RevokeRoleMultParams

Revoke role params

```solidity
struct RevokeRoleMultParams {
  bytes32 role;
  address account;
}
```

### SetRoleDelayParams

Set role delay params

```solidity
struct SetRoleDelayParams {
  bytes32 role;
  uint32 delay;
}
```

### SetUserFacingRole

```solidity
event SetUserFacingRole(bytes32 role, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | OZ role for the scope |
| enabled | bool | whether that role is user facing |

### SetGrantOperatorRole

```solidity
event SetGrantOperatorRole(bytes32 masterRole, address targetContract, address operator, bytes4 functionSelector, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | contract whose function is scoped. |
| operator | address | address that may call `setFunctionPermission` for this scope. |
| functionSelector | bytes4 | selector of the scoped function. |
| enabled | bool | grant or revoke grant-operator status. |

### SetPermissionRole

```solidity
event SetPermissionRole(bytes32 masterRole, address targetContract, address account, bytes4 functionSelector, bool enabled)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | contract whose function is scoped. |
| account | address | address receiving or losing permission |
| functionSelector | bytes4 | selector of the scoped function. |
| enabled | bool | grant or revoke |

### SetDefaultDelay

```solidity
event SetDefaultDelay(uint32 defaultDelay)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| defaultDelay | uint32 | new default delay |

### SetRoleDelays

```solidity
event SetRoleDelays(struct IMidasAccessControl.SetRoleDelayParams[] params)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetRoleDelayParams[] | array of SetRoleDelayParams |

### SetRoleDelay

```solidity
event SetRoleDelay(bytes32 role, uint32 delay)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role id |
| delay | uint32 | delay value |

### EmptyArray

```solidity
error EmptyArray()
```

when the array is empty

### MismatchArrays

```solidity
error MismatchArrays(uint256 length1, uint256 length2)
```

when the arrays have different lengths

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| length1 | uint256 | length of the first array |
| length2 | uint256 | length of the second array |

### Forbidden

```solidity
error Forbidden()
```

error when the function is forbidden

### CannotRevokeFromSelf

```solidity
error CannotRevokeFromSelf(bytes32 role, address account)
```

when the role is being revoked from the self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role to be revoked |
| account | address | account to be revoked |

### DelayIsAlreadySet

```solidity
error DelayIsAlreadySet()
```

when the delay is already set

### RoleAdminMismatch

```solidity
error RoleAdminMismatch(bytes32 role, bytes32 adminRole)
```

when the role admin mismatch

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role to be revoked |
| adminRole | bytes32 | admin role |

### setUserFacingRoleMult

```solidity
function setUserFacingRoleMult(struct IMidasAccessControl.SetUserFacingRoleParams[] params) external
```

Enable or disable which OZ role may administer function-access scopes for that role.

_Only `DEFAULT_ADMIN_ROLE` can call this function.
Prevents unrelated role admins from spamming access mappings._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetUserFacingRoleParams[] | array of SetUserFacingRoleParams |

### setGrantOperatorRoleMult

```solidity
function setGrantOperatorRoleMult(address targetContract, struct IMidasAccessControl.SetGrantOperatorRoleParams[] params) external
```

Add or remove a grant operator for a specific contract function scope.

_`targetContract` must implement `IMidasAccessControlManaged` interface;
Caller must hold `contractAdminRole` of a target contract;_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targetContract | address | scoped contract |
| params | struct IMidasAccessControl.SetGrantOperatorRoleParams[] | array of SetGrantOperatorRoleParams |

### setPermissionRoleMult

```solidity
function setPermissionRoleMult(address targetContract, bytes4 functionSelector, uint32 delay, struct IMidasAccessControl.SetPermissionRoleParams[] params) external
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope or have the master role
target contract must implement `IMidasAccessControlManaged` interface;_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| delay | uint32 | delay value |
| params | struct IMidasAccessControl.SetPermissionRoleParams[] | array of SetPermissionRoleParams |

### setPermissionRoleMult

```solidity
function setPermissionRoleMult(bytes32 masterRole, address targetContract, bytes4 functionSelector, uint32 delay, struct IMidasAccessControl.SetPermissionRoleParams[] params) external
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope or have the master role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| delay | uint32 | delay value |
| params | struct IMidasAccessControl.SetPermissionRoleParams[] | array of SetPermissionRoleParams |

### grantRole

```solidity
function grantRole(bytes32 role, address account, uint32 delay) external
```

Grant a role to an account with a delay

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role id |
| account | address | account to grant the role to |
| delay | uint32 | delay value |

### grantRoleMult

```solidity
function grantRoleMult(struct IMidasAccessControl.GrantRoleMultParams[] params) external
```

grant multiple roles to multiple users in one transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.GrantRoleMultParams[] | array of GrantRoleMultParams |

### revokeRoleMult

```solidity
function revokeRoleMult(struct IMidasAccessControl.RevokeRoleMultParams[] params) external
```

revoke multiple roles from multiple users in one transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.RevokeRoleMultParams[] | array of RevokeRoleMultParams |

### setDefaultDelay

```solidity
function setDefaultDelay(uint32 _defaultDelay) external
```

Sets the default delay

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultDelay | uint32 | default delay in seconds |

### setRoleDelayMult

```solidity
function setRoleDelayMult(struct IMidasAccessControl.SetRoleDelayParams[] params) external
```

Sets timelock delay per role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetRoleDelayParams[] | array of SetRoleDelayParams |

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

### isUserFacingRole

```solidity
function isUserFacingRole(bytes32 role) external view returns (bool)
```

Whether `role` is user facing.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | OZ role for the scope |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | enabled whether `role` is user facing |

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 masterRole, address targetContract, bytes4 functionSelector, address operator) external view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 key, address operator) external view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | operator permission key |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 masterRole, address targetContract, bytes4 functionSelector, address account) external view returns (bool)
```

Whether `account` may call the scoped function on `targetContract`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| account | address | address checked for permissio. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 key, address account) external view returns (bool)
```

Whether `account` has function access for the scope.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | the base key for function permission mappings |
| account | address | address checked for permission |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

### permissionRoleKey

```solidity
function permissionRoleKey(bytes32 masterRole, address targetContract, bytes4 functionSelector) external pure returns (bytes32)
```

calculates the base key for function permission mappings

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function of a `targetContract` |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | key the base key for function permission mappings |

### grantOperatorRoleKey

```solidity
function grantOperatorRoleKey(bytes32 masterRole, address targetContract, bytes4 functionSelector) external pure returns (bytes32)
```

calculates the base key for function permission mappings

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function of a `targetContract` |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | key the base key for function permission mappings |

### getRoleTimelockDelay

```solidity
function getRoleTimelockDelay(bytes32 role, uint32 overrideDelay) external view returns (uint32 delay, bool isDefault)
```

Returns timelock delay for a role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role id |
| overrideDelay | uint32 | override delay for the invocation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| delay | uint32 | effective delay in seconds |
| isDefault | bool | true if role uses default delay |

### defaultDelay

```solidity
function defaultDelay() external view returns (uint32 delay)
```

Default timelock delay when role delay is not set

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| delay | uint32 | delay in seconds |

### timelockManager

```solidity
function timelockManager() external view returns (address)
```

address of the timelock manager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | timelockManager address of the timelock manager |

### pauseManager

```solidity
function pauseManager() external view returns (address)
```

address of the pause manager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | pauseManager address of the pause manager |

## IMidasAccessControlManaged

Interface for contracts that are managed by the MidasAccessControl

### contractAdminRole

```solidity
function contractAdminRole() external view returns (bytes32)
```

returns the role that can pause the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role role descriptor |

## TimelockOperationStatus

Timelock operation status

_Computed status may differ from stored status (expiry, dispute period)._

```solidity
enum TimelockOperationStatus {
  NotExist,
  Pending,
  Paused,
  ApprovedExecution,
  ReadyToExecute,
  ReadyToAbort,
  Expired,
  Aborted,
  Executed,
  ExecutedWithFailure
}
```

## GetOperationStatusResult

Operation details returned by `getOperationDetails`

```solidity
struct GetOperationStatusResult {
  enum TimelockOperationStatus status;
  uint32 createdAt;
  uint32 executionApprovedAt;
  uint8 pauseReasonCode;
  uint256 councilVersion;
  address operationProposer;
  address pauser;
  bytes32 dataHash;
  uint8 votesForExecution;
  uint8 votesForVeto;
  bool isSetCouncilOperation;
}
```

## IMidasTimelockManager

Interface for the MidasTimelockManager

### ScheduleTimelockOperationParams

Parameters for scheduling a timelock operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

```solidity
struct ScheduleTimelockOperationParams {
  address target;
  bytes data;
}
```

### SetMaxPendingOperationsPerProposer

```solidity
event SetMaxPendingOperationsPerProposer(uint256 maxPendingOperationsPerProposer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maxPendingOperationsPerProposer | uint256 | new limit |

### SetSecurityCouncil

```solidity
event SetSecurityCouncil(uint256 version, address[] members)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | new security council version |
| members | address[] | council member addresses |

### ScheduleTimelockOperation

```solidity
event ScheduleTimelockOperation(address caller, bytes32 operationId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | operation proposer |
| operationId | bytes32 | scheduled operation id |

### PauseTimelockOperation

```solidity
event PauseTimelockOperation(address caller, bytes32 operationId, uint8 pauseReasonCode, uint256 councilVersion)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | pauser address |
| operationId | bytes32 | paused operation id |
| pauseReasonCode | uint8 | pause reason code |
| councilVersion | uint256 | security council version at pause |

### ExecuteTimelockOperation

```solidity
event ExecuteTimelockOperation(address caller, bytes32 operationId, bool success)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | executor address |
| operationId | bytes32 | executed operation id |
| success | bool | true if operation executed successfully, false otherwise |

### PausedProposalVoteCast

```solidity
event PausedProposalVoteCast(address caller, bytes32 operationId, bool votedForExecution)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | council member address |
| operationId | bytes32 | operation id |
| votedForExecution | bool | true for execution vote, false for veto vote |

### AbortTimelockOperation

```solidity
event AbortTimelockOperation(address caller, bytes32 operationId, enum TimelockOperationStatus status)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caller | address | address that aborted the operation |
| operationId | bytes32 | aborted operation id |
| status | enum TimelockOperationStatus | status before abort |

### RolePreflightSucceeded

```solidity
error RolePreflightSucceeded(bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperator, bool validateFunctionRole)
```

Preflight call succeeded with role info

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role used for the call |
| overrideDelay | uint32 | override delay for the invocation |
| roleIsFunctionOperator | bool | true if role is function operator |
| validateFunctionRole | bool | true if function role should be validated |

### TimelockAlreadySet

```solidity
error TimelockAlreadySet()
```

Timelock address is already set

### UnexpectedOperationStatus

```solidity
error UnexpectedOperationStatus(enum TimelockOperationStatus actualStatus)
```

Operation status is not valid for this action

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| actualStatus | enum TimelockOperationStatus | current operation status |

### OperationNotPending

```solidity
error OperationNotPending()
```

Operation is not in the pending set

### OperationAlreadyPending

```solidity
error OperationAlreadyPending()
```

Operation is already pending

### TimelockOperationNotReady

```solidity
error TimelockOperationNotReady()
```

Timelock delay has not passed yet

### NotInSecurityCouncil

```solidity
error NotInSecurityCouncil()
```

Caller is not a security council member for this operation

### AlreadyVoted

```solidity
error AlreadyVoted()
```

Council member already voted

### NoTimelockDelayForRole

```solidity
error NoTimelockDelayForRole()
```

Role has no timelock delay configured

### TooManyPendingOperations

```solidity
error TooManyPendingOperations()
```

Proposer has too many pending operations

### PendingSetCouncilOperationExists

```solidity
error PendingSetCouncilOperationExists()
```

Pending set-council operation already exists

### InvalidSecurityCouncilMembersLength

```solidity
error InvalidSecurityCouncilMembersLength()
```

Security council size is out of allowed range

### InvalidMaxPendingOperationsPerProposer

```solidity
error InvalidMaxPendingOperationsPerProposer()
```

Max pending operations value is invalid

### PreflightCallUnexpectedSuccess

```solidity
error PreflightCallUnexpectedSuccess()
```

Target call should have reverted on preflight

### InvalidPreflightError

```solidity
error InvalidPreflightError(bytes err)
```

Preflight revert data is invalid

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| err | bytes | revert bytes |

### setMaxPendingOperationsPerProposer

```solidity
function setMaxPendingOperationsPerProposer(uint256 _maxPendingOperationsPerProposer) external
```

Sets max pending operations per proposer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxPendingOperationsPerProposer | uint256 | new limit |

### setSecurityCouncil

```solidity
function setSecurityCouncil(address[] members) external
```

Sets a new security council version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| members | address[] | council member addresses |

### bulkScheduleTimelockOperation

```solidity
function bulkScheduleTimelockOperation(struct IMidasTimelockManager.ScheduleTimelockOperationParams[] params) external
```

Schedules multiple timelock operations

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasTimelockManager.ScheduleTimelockOperationParams[] | array of schedule timelock operation parameters |

### scheduleTimelockOperation

```solidity
function scheduleTimelockOperation(struct IMidasTimelockManager.ScheduleTimelockOperationParams params) external
```

Schedules one timelock operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasTimelockManager.ScheduleTimelockOperationParams | schedule timelock operation parameters |

### executeTimelockOperation

```solidity
function executeTimelockOperation(address target, bytes data, bool revertOnFailure) external
```

Executes a scheduled timelock operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |
| revertOnFailure | bool | true if execution should revert on failure |

### pauseOperation

```solidity
function pauseOperation(bytes32 operationId, uint8 pauseReasonCode) external
```

Pauses a pending operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |
| pauseReasonCode | uint8 | reason code set by pauser |

### voteForVeto

```solidity
function voteForVeto(bytes32 operationId) external
```

Security council votes to abort the operation

_can vote even if member is already voted for execution_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### voteForExecution

```solidity
function voteForExecution(bytes32 operationId) external
```

Security council votes to allow execution

_cannot vote if member is already voted for veto_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### abortOperation

```solidity
function abortOperation(bytes32 operationId) external
```

Aborts operation after veto quorum or expiry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### getOriginalProposer

```solidity
function getOriginalProposer(address target, bytes data) external view returns (address)
```

Returns original proposer for a pending operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | proposer address |

### councilQuorum

```solidity
function councilQuorum(uint256 version) external view returns (uint8 quorum)
```

Votes needed for council quorum at a version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| quorum | uint8 | required votes |

### getCouncilMemberVoteStatus

```solidity
function getCouncilMemberVoteStatus(bytes32 operationId, address councilMember) external view returns (bool votedForExecution, bool votedForVeto)
```

Whether a council member voted on an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |
| councilMember | address | member address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| votedForExecution | bool | true if voted for execution |
| votedForVeto | bool | true if voted for veto |

### getPendingOperations

```solidity
function getPendingOperations() external view returns (bytes32[] operationIds)
```

Returns all pending operation ids

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationIds | bytes32[] | pending operation ids |

### getOperationDetails

```solidity
function getOperationDetails(bytes32 operationId) external view returns (struct GetOperationStatusResult result)
```

Returns full operation details

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct GetOperationStatusResult | operation details |

### getOperationStatus

```solidity
function getOperationStatus(bytes32 operationId) external view returns (enum TimelockOperationStatus status)
```

Returns operation status (with expiry/dispute rules applied)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum TimelockOperationStatus | current status |

### getOperationStatusRaw

```solidity
function getOperationStatusRaw(bytes32 operationId) external view returns (enum TimelockOperationStatus status)
```

Returns stored operation status without adjustments

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum TimelockOperationStatus | stored status |

### getSecurityCouncilMembers

```solidity
function getSecurityCouncilMembers(uint256 version) external view returns (address[] members)
```

Returns security council members for a version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| members | address[] | member addresses |

### getOperationId

```solidity
function getOperationId(address target, bytes data) external view returns (bytes32 operationId)
```

Returns operation id for target and data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### getTargetRole

```solidity
function getTargetRole(address target, bytes data, address proposer) external view returns (bytes32 role, uint32 overrideDelay)
```

_gets the target role for a given operation_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |
| proposer | address | operation proposer address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | target role |
| overrideDelay | uint32 | override delay for the invocation |

### isInSecurityCouncil

```solidity
function isInSecurityCouncil(uint256 version, address account) external view returns (bool)
```

Checks if an account is in the security council for a given version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |
| account | address | account to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the account is in the security council |

### timelock

```solidity
function timelock() external view returns (address timelockAddress)
```

Timelock controller address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| timelockAddress | address | timelock controller |

### maxPendingOperationsPerProposer

```solidity
function maxPendingOperationsPerProposer() external view returns (uint256)
```

Max pending operations per proposer

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | value current limit |

### securityCouncilVersion

```solidity
function securityCouncilVersion() external view returns (uint256)
```

Current security council version

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | version council version |

### dataHashIndexes

```solidity
function dataHashIndexes(bytes32 dataHash) external view returns (uint256)
```

Data hash index used for operation id salt

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| dataHash | bytes32 | operation data hash |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | index current index for this data hash |

### proposerPendingOperationsCount

```solidity
function proposerPendingOperationsCount(address proposer) external view returns (uint256)
```

Pending operations count for a proposer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposer | address | proposer address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | count pending count |

### pendingSetCouncilOperationId

```solidity
function pendingSetCouncilOperationId() external view returns (bytes32)
```

Pending set-security-council operation id, if any

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | operationId operation id or zero |

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

## MidasAuthLibrary

### NoFunctionPermission

```solidity
error NoFunctionPermission(bytes32 roleUsed, bytes4 functionSelector, address account)
```

error when the function permission is not found

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleUsed | bytes32 | role used |
| functionSelector | bytes4 | function selector |
| account | address | account |

### NotGreenlisted

```solidity
error NotGreenlisted(address account, bytes32 greenlistedRole)
```

error when the account is not greenlisted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account |
| greenlistedRole | bytes32 | greenlisted role |

### Blacklisted

```solidity
error Blacklisted(bytes32 blacklistedRole, address account)
```

error when the account is blacklisted

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| blacklistedRole | bytes32 | blacklisted role |
| account | address | account |

### SenderIsNotTimelock

```solidity
error SenderIsNotTimelock(bytes32 roleUsed, bytes4 functionSelector, address sender)
```

error when the sender is not the timelock

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleUsed | bytes32 | role used |
| functionSelector | bytes4 | function selector |
| sender | address | sender |

### UserFacingRoleNotAllowed

```solidity
error UserFacingRoleNotAllowed(bytes32 role)
```

error when the user facing role is not allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role |

### InvalidDelay

```solidity
error InvalidDelay()
```

error when the delay is invalid

### DEFAULT_GREENLISTED_ROLE

```solidity
bytes32 DEFAULT_GREENLISTED_ROLE
```

default role for greenlisted actor

### DEFAULT_BLACKLISTED_ROLE

```solidity
bytes32 DEFAULT_BLACKLISTED_ROLE
```

default role for blacklisted actor

### NO_DELAY

```solidity
uint32 NO_DELAY
```

timelock value that represents no delay

### NULL_DELAY

```solidity
uint32 NULL_DELAY
```

timelock value that represents non-set delay

### MAX_DELAY

```solidity
uint32 MAX_DELAY
```

maximum delay for a role

### validateFunctionAccessWithTimelock

```solidity
function validateFunctionAccessWithTimelock(contract IMidasAccessControl accessControl, bytes32 contractAdminRole, uint32 overrideDelay, bool roleIsFunctionOperatorRole, address accountToCheck, bool validateFunctionRole) internal view returns (address)
```

_validates that the function access is valid with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| contractAdminRole | bytes32 | contract admin role |
| overrideDelay | uint32 |  |
| roleIsFunctionOperatorRole | bool | whether the role is a function operator |
| accountToCheck | address | account to check |
| validateFunctionRole | bool | whether to validate the function role |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | actualAccount actual account that has access to the function |

### validateFunctionAccess

```solidity
function validateFunctionAccess(contract IMidasAccessControl accessControl, address targetContract, bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperatorRole, address account, bytes4 functionSelector, bool validateFunctionRole) internal view returns (bytes32)
```

_validates that the function access is valid_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| targetContract | address |  |
| role | bytes32 | admin role |
| overrideDelay | uint32 | override delay for the invocation |
| roleIsFunctionOperatorRole | bool | whether the role is a function operator role |
| account | address | account to check |
| functionSelector | bytes4 | function selector |
| validateFunctionRole | bool | whether to validate the function role |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | roleUsed role used to validate the function access |

### requireNotUserFacingRole

```solidity
function requireNotUserFacingRole(contract IMidasAccessControl accessControl, bytes32 role) internal view
```

_validates that the role is not a user facing role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| role | bytes32 | role |

### requireGreenlisted

```solidity
function requireGreenlisted(contract IMidasAccessControl accessControl, address account, bytes32 greenlistedRole) internal view
```

_checks that a given `account` has `greenlistedRole`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| account | address | account |
| greenlistedRole | bytes32 | greenlisted role |

### requireNotBlacklisted

```solidity
function requireNotBlacklisted(contract IMidasAccessControl accessControl, address account, bytes32 blacklistedRole) internal view
```

_checks that a given `account` doesnt have `blacklistedRole`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| account | address | account |
| blacklistedRole | bytes32 | blacklisted role |

### resolveAccessRole

```solidity
function resolveAccessRole(contract IMidasAccessControl accessControl, bytes32 rootRole, bytes32 functionRoleKey, uint32 overrideDelay) internal view returns (bytes32 roleUsed)
```

_resolves the access role based on the shortest delay_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl | access control contract |
| rootRole | bytes32 | root role |
| functionRoleKey | bytes32 | function key |
| overrideDelay | uint32 | override delay |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleUsed | bytes32 | role used to validate the function access |

### validateTimelockDelay

```solidity
function validateTimelockDelay(uint32 delay) internal view
```

validates that the delay is within the maximum delay

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| delay | uint32 | delay to validate |

### appendProposer

```solidity
function appendProposer(bytes data, address proposer) internal pure returns (bytes)
```

_appends the proposer to the data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | bytes | operation data |
| proposer | address | proposer address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | appended data |

### resolveProposer

```solidity
function resolveProposer(bytes data) internal pure returns (address proposer)
```

_resolves the proposer from the data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | bytes | data |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| proposer | address | proposer address |

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

## CompositeDataFeedTest

### constructor

```solidity
constructor() public
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## DataFeedTest

### constructor

```solidity
constructor() public
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

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

### constructor

```solidity
constructor(bytes32 _contractAdminRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |

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

### setMinMaxAnswer

```solidity
function setMinMaxAnswer(int192 _minAnswer, int192 _maxAnswer) external
```

sets the min and max answer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minAnswer | int192 | the new min answer |
| _maxAnswer | int192 | the new max answer |

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

### setMaxAnswerDeviation

```solidity
function setMaxAnswerDeviation(uint256 _maxAnswerDeviation) external
```

sets the max answer deviation

_the max answer deviation is the maximum allowed deviation from the latest price_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxAnswerDeviation | uint256 | the new max answer deviation in % |

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

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

### MaxAnswerDeviationUpdated

```solidity
event MaxAnswerDeviationUpdated(uint256 maxAnswerDeviation)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maxAnswerDeviation | uint256 | the new max answer deviation |

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

### SetMinMaxAnswer

```solidity
event SetMinMaxAnswer(int192 minAnswer, int192 maxAnswer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minAnswer | int192 | the new min answer |
| maxAnswer | int192 | the new max answer |

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

### setMaxAnswerDeviation

```solidity
function setMaxAnswerDeviation(uint256 _maxAnswerDeviation) external
```

sets the max answer deviation

_the max answer deviation is the maximum allowed deviation from the latest price_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxAnswerDeviation | uint256 | the new max answer deviation in % |

### setMinMaxAnswer

```solidity
function setMinMaxAnswer(int192 _minAnswer, int192 _maxAnswer) external
```

sets the min and max answer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minAnswer | int192 | the new min answer |
| _maxAnswer | int192 | the new max answer |

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

## CustomAggregatorV3CompatibleFeedGrowthTester

### constructor

```solidity
constructor() public
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

### getDeviation

```solidity
function getDeviation(int256 _lastPrice, int256 _newPrice, bool _validateOnlyUp) public pure returns (uint256)
```

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

### mintRequests

```solidity
mapping(uint256 => struct Request) mintRequests
```

request data storage

### totalMinted

```solidity
mapping(address => uint256) totalMinted
```

_how much mTokens were minted by the depositor
depositor address => amount minted_

### minMTokenAmountForFirstDeposit

```solidity
uint256 minMTokenAmountForFirstDeposit
```

minimal USD amount for first user`s deposit

### maxSupplyCap

```solidity
uint256 maxSupplyCap
```

max supply cap value in mToken

_if after the deposit, mToken.totalSupply() > maxSupplyCap,
the tx will be reverted_

### maxAmountPerRequest

```solidity
uint256 maxAmountPerRequest
```

max amount per request in mToken

### upcomingSupply

```solidity
uint256 upcomingSupply
```

pending supply in mToken that will be released
after the deposit request is processed

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base ManageableVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct DepositVaultInitParams _depositVaultInitParams) public
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _depositVaultInitParams | struct DepositVaultInitParams | init params for deposit vault |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId) external returns (uint256)
```

depositing proccess with auto mint if
account fit daily limit and token allowance.
Transfers token from the user.
Transfers fee in tokenIn to tokensReceiver.
Mints mToken to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | mintAmount amount of mToken that was minted |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId, address recipient) external returns (uint256)
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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | mintAmount amount of mToken that was minted |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId) external returns (uint256 requestId)
```

depositing proccess with mint request creating if
account fit token allowance.
Transfers token from the user.
Transfers fee in tokenIn to tokensReceiver.
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
| requestId | uint256 | request id |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256, uint256)
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
| [1] | uint256 | instantMintAmount amount of mToken that was minted instantly |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the mToken rate from the request.
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate, bool isAvgRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |
| isAvgRate | bool | if true, newOutRate is avg rate |

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

### setMaxAmountPerRequest

```solidity
function setMaxAmountPerRequest(uint256 newValue) external
```

sets new max amount per request
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max amount per request |

### getEffectiveMTokenSupply

```solidity
function getEffectiveMTokenSupply() external view returns (uint256)
```

calculates effective mToken supply including upcoming supply

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | effective mToken supply |

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
function _validateRequest(uint256 requestId, address validateAddress, enum RequestStatus status) internal pure
```

validates request
if exist
if status is expected

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
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
function _calculateHoldbackPartRateFromAvg(struct Request request, uint256 avgMTokenRate) internal pure returns (uint256)
```

_calculates holdback part rate from avg rate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct Request | request |
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
event SetAavePool(address token, address pool)
```

Emitted when an Aave V3 Pool is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |
| pool | address | Aave V3 Pool address |

### RemoveAavePool

```solidity
event RemoveAavePool(address token)
```

Emitted when an Aave V3 Pool is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
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

### TokenNotInPool

```solidity
error TokenNotInPool(address aavePool, address token)
```

when token is not in pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| aavePool | address | Aave V3 Pool address |
| token | address | token address |

### PoolNotSet

```solidity
error PoolNotSet(address token)
```

when pool is not set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### AutoInvestFailed

```solidity
error AutoInvestFailed(bytes err)
```

when auto-invest fails

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| err | bytes | error bytes |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base DepositVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

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
event SetMTokenDepositVault(address newVault)
```

Emitted when the mToken DepositVault address is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
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

### ZeroMTokenReceived

```solidity
error ZeroMTokenReceived(uint256 mTokenReceived)
```

when zero mToken is received

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| mTokenReceived | uint256 | mToken received |

### AutoInvestFailed

```solidity
error AutoInvestFailed(bytes err)
```

when auto-invest fails

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| err | bytes | error bytes |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base DepositVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct DepositVaultInitParams _depositVaultInitParams, address _mTokenDepositVault) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _depositVaultInitParams | struct DepositVaultInitParams | init params for deposit vault |
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
event SetMorphoVault(address token, address vault)
```

Emitted when a Morpho Vault is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |
| vault | address | Morpho Vault address |

### RemoveMorphoVault

```solidity
event RemoveMorphoVault(address token)
```

Emitted when a Morpho Vault is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
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

### AssetMismatch

```solidity
error AssetMismatch(address morphoVault, address token)
```

when asset mismatch

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| morphoVault | address | Morpho Vault address |
| token | address | token address |

### VaultNotSet

```solidity
error VaultNotSet(address token)
```

when vault is not set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### ZeroShares

```solidity
error ZeroShares(uint256 shares)
```

when zero shares are received

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | shares |

### AutoInvestFailed

```solidity
error AutoInvestFailed(bytes err)
```

when auto-invest fails

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| err | bytes | error bytes |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base DepositVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

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

### UnsupportedUSTBToken

```solidity
error UnsupportedUSTBToken(address token)
```

when USTB token is not supported

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### USTBFeeNotZero

```solidity
error USTBFeeNotZero(uint256 fee)
```

when USTB fee is not zero

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | fee |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base DepositVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct DepositVaultInitParams _depositVaultInitParams, address _ustb) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _depositVaultInitParams | struct DepositVaultInitParams | init params for deposit vault |
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
mapping(uint256 => struct Request) redeemRequests
```

mapping, requestId to request data

### loanRequests

```solidity
mapping(uint256 => struct LiquidityProviderLoanRequest) loanRequests
```

mapping, loanRequestId to loan request data

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

### loanRepaymentAddress

```solidity
address loanRepaymentAddress
```

address from which payment tokens will be pulled during loan repayment

### loanApr

```solidity
uint256 loanApr
```

loan APR value in basis points (100 = 1%)

### preferLoanLiquidity

```solidity
bool preferLoanLiquidity
```

flag to determine if the loan LP liquidity should be used first

### currentLoanRequestId

```solidity
uint256 currentLoanRequestId
```

last loan request id

### loanSwapperVault

```solidity
contract IRedemptionVault loanSwapperVault
```

address of loan RedemptionVault-compatible vault

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base ManageableVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct RedemptionVaultInitParams _redemptionVaultInitParams) public
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _redemptionVaultInitParams | struct RedemptionVaultInitParams | init params for redemption vault |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external returns (uint256)
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mToken from the user.
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountTokenOut amount of tokenOut that was received in original decimals |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external returns (uint256)
```

Does the same as original `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountTokenOut amount of tokenOut that was received in original decimals |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256 requestId)
```

creating redeem request
Transfers amount in mToken to contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256, uint256)
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
| [1] | uint256 | instantReceivedAmount amount of tokenOut that was received instantly in original decimals |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the mToken rate
from the request. WONT fail even if there is not enough liquidity
to process all requests.
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newMTokenRate, bool isAvgRate) external
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
| isAvgRate | bool | if true, newMTokenRate is avg rate |

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
function bulkRepayLpLoanRequest(uint256[] requestIds) external
```

repaying loan requests from the `requestIds` array
Transfers tokenOut to loan repayment address
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

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

### setLoanApr

```solidity
function setLoanApr(uint256 newLoanApr) external
```

set loan APR value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanApr | uint256 | new loan APR value in basis points (100 = 1%) |

### setPreferLoanLiquidity

```solidity
function setPreferLoanLiquidity(bool newLoanLpFirst) external
```

set flag to determine if the loan LP liquidity should be used first

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFirst | bool | new flag to determine if the loan LP liquidity should be used first |

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address, uint256, uint256, uint256, uint256) internal virtual returns (uint256)
```

_Check if contract has enough tokenOut balance for redeem,
if not, obtains liquidity trough the custom strategies.
In default implementation it does nothing._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | obtainedLiquidityBase18 amount of tokenOut obtained |

### _obtainVaultLiquidityExternal

```solidity
function _obtainVaultLiquidityExternal(address tokenOut, uint256 missingAmountBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) external returns (uint256)
```

This function can only be called by the contract itself (self-call restriction)

_only calls _obtainVaultLiquidity internally and external because its used with try/catch_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | tokenOut address |
| missingAmountBase18 | uint256 | amount of tokenOut needed in base 18 |
| tokenOutRate | uint256 | tokenOut rate |
| currentTokenOutBalanceBase18 | uint256 | current balance of tokenOut in the vault in base 18 |
| tokenOutDecimals | uint256 | decimals of tokenOut |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | obtainedLiquidityBase18 amount of tokenOut obtained |

### _obtainLoanLpLiquidityExternal

```solidity
function _obtainLoanLpLiquidityExternal(address tokenOut, uint256 missingAmountBase18, uint256 totalAmount, uint256 tokenOutRate, uint256 totalFee, uint256 tokenOutDecimals) external returns (uint256, uint256)
```

This function can only be called by the contract itself (self-call restriction)

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

### _calculateHoldbackPartRateFromAvg

```solidity
function _calculateHoldbackPartRateFromAvg(struct Request request, uint256 avgMTokenRate) internal pure returns (uint256)
```

_calculates holdback part rate from avg rate_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| request | struct Request | request |
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
event SetAavePool(address token, address pool)
```

Emitted when an Aave V3 Pool is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |
| pool | address | Aave V3 Pool address |

### RemoveAavePool

```solidity
event RemoveAavePool(address token)
```

Emitted when an Aave V3 Pool is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |

### TokenNotInPool

```solidity
error TokenNotInPool(address aavePool, address token)
```

when token is not in aave pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| aavePool | address | Aave V3 Pool address |
| token | address | token address |

### PoolNotSet

```solidity
error PoolNotSet(address token)
```

when pool is not set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### InsufficientWithdrawnAmount

```solidity
error InsufficientWithdrawnAmount(uint256 withdrawnAmount, uint256 toWithdraw)
```

when insufficient withdrawn amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| withdrawnAmount | uint256 | withdrawn amount |
| toWithdraw | uint256 | amount to withdraw |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base RedemptionVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

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

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256, uint256 tokenOutDecimals) internal virtual returns (uint256)
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

mToken RedemptionVault used for fallback redemptions

### SetRedemptionVault

```solidity
event SetRedemptionVault(address newVault)
```

Emitted when the redemption vault address is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newVault | address | new redemption vault address |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base RedemptionVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct RedemptionVaultInitParams _redemptionInitParams, address _redemptionVault) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _redemptionInitParams | struct RedemptionVaultInitParams | init params for redemption vault state values |
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

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256 tokenOutRate, uint256, uint256 tokenOutDecimals) internal virtual returns (uint256)
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
| tokenOutDecimals | uint256 |  |

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
event SetMorphoVault(address token, address vault)
```

Emitted when a Morpho Vault is configured for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |
| vault | address | Morpho Vault address |

### RemoveMorphoVault

```solidity
event RemoveMorphoVault(address token)
```

Emitted when a Morpho Vault is removed for a payment token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | payment token address |

### AssetMismatch

```solidity
error AssetMismatch(address morphoVault, address token)
```

when asset mismatch

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| morphoVault | address | Morpho Vault address |
| token | address | token address |

### VaultNotSet

```solidity
error VaultNotSet(address token)
```

when vault is not set

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base RedemptionVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

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

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256, uint256 tokenOutDecimals) internal virtual returns (uint256)
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

## RedemptionVaultWithUSTB

Smart contract that handles redemptions using USTB

### ustbRedemption

```solidity
contract IUSTBRedemption ustbRedemption
```

USTB redemption contract address

_Used to handle USTB redemptions when vault has insufficient USDC_

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) public
```

Passes role identifiers to the base RedemptionVault constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role identifier |
| _greenlistedRole | bytes32 | greenlisted role identifier |

### initialize

```solidity
function initialize(struct CommonVaultInitParams _commonVaultInitParams, struct RedemptionVaultInitParams _redemptionInitParams, address _ustbRedemption) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |
| _redemptionInitParams | struct RedemptionVaultInitParams | init params for redemption vault state values |
| _ustbRedemption | address | USTB redemption contract address |

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 missingAmountBase18, uint256, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal virtual returns (uint256)
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

## ManageableVault

Contract with base Vault methods

### STABLECOIN_RATE

```solidity
uint256 STABLECOIN_RATE
```

stable coin static rate 1:1 USD in 18 decimals

### ONE_HUNDRED_PERCENT

```solidity
uint256 ONE_HUNDRED_PERCENT
```

100 percent with base 100

_for example, 10% will be (10 * 100)%_

### tokensConfig

```solidity
mapping(address => struct TokenConfig) tokensConfig
```

mapping, token address to token config

### isFreeFromMinAmount

```solidity
mapping(address => bool) isFreeFromMinAmount
```

mapping, user address => is free frmo min amounts

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

### currentRequestId

```solidity
uint256 currentRequestId
```

last request id

### nextExpectedRequestIdToProcess

```solidity
uint256 nextExpectedRequestIdToProcess
```

next expected request id to process

### maxApproveRequestId

```solidity
uint256 maxApproveRequestId
```

max requestId that can be approved

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

### variationTolerance

```solidity
uint256 variationTolerance
```

variation tolerance of tokenOut rates for "safe" requests approve

### minAmount

```solidity
uint256 minAmount
```

basic min operations amount

### instantFee

```solidity
uint256 instantFee
```

_fee for initial operations 1% = 100_

### minInstantFee

```solidity
uint256 minInstantFee
```

minimum instant fee

### maxInstantFee

```solidity
uint256 maxInstantFee
```

maximum instant fee

### maxInstantShare

```solidity
uint256 maxInstantShare
```

maximum instant share value in basis points (100 = 1%)

### sequentialRequestProcessing

```solidity
bool sequentialRequestProcessing
```

enforce sequential request processing flag

### validateUserAccess

```solidity
modifier validateUserAccess(address recipient)
```

_validate msg.sender and recipient access, validates if function is not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | recipient address |

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole) internal
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |
| _greenlistedRole | bytes32 | greenlisted role |

### __ManageableVault_init

```solidity
function __ManageableVault_init(struct CommonVaultInitParams _commonVaultInitParams) internal
```

_upgradeable pattern contract`s initializer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _commonVaultInitParams | struct CommonVaultInitParams | init params for common vault |

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

_reverts if new tolerance > 100%_

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

### setWaivedFeeAccount

```solidity
function setWaivedFeeAccount(address account, bool enable) external
```

sets a account to waived fee restriction.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |
| enable | bool | is enabled |

### setTokensReceiver

```solidity
function setTokensReceiver(address receiver) external
```

set new receiver for tokens.
can be called only from permissioned actor.

_reverts address zero or equal address(this)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | new token receiver address |

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
function setMinMaxInstantFee(uint256 newMinInstantFee, uint256 newMaxInstantFee) external
```

set new minimum/maximum instant fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinInstantFee | uint256 | new minimum instant fee |
| newMaxInstantFee | uint256 | new maximum instant fee |

### setMaxInstantShare

```solidity
function setMaxInstantShare(uint256 newMaxInstantShare) external
```

set maximum instant share value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxInstantShare | uint256 | new maximum instant share value in basis points (100 = 1%) |

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

### setSequentialRequestProcessing

```solidity
function setSequentialRequestProcessing(bool enforce) external
```

set enforce sequential request processing flag

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enforce | bool | enforce sequential request processing flag |

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

### getInstantLimitStatuses

```solidity
function getInstantLimitStatuses() external view returns (struct RateLimitLibrary.WindowRateLimitStatus[])
```

returns array of instant rate limit statuses

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct RateLimitLibrary.WindowRateLimitStatus[] | statuses array of instant rate limit statuses |

### greenlistedRole

```solidity
function greenlistedRole() public view virtual returns (bytes32)
```

AC role of a greenlist

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

### _requireAndUpdateLimit

```solidity
function _requireAndUpdateLimit(uint256 amount) internal
```

_check if operation exceed daily limit and update limit data_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | operation amount (decimals 18) |

### _validateAndUpdateNextRequestIdToProcess

```solidity
function _validateAndUpdateNextRequestIdToProcess(uint256 requestId, bool revertIfInvalid) internal returns (bool isValid)
```

_check if request id is sequential and update next expected request id to process_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| revertIfInvalid | bool | if true, reverts if request id is not sequential, otherwise returns false |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isValid | bool | true if request id is sequential or sequentialRequestProcessing is disabled |

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
function _getFeeAmount(uint256 feePercent, uint256 amount) internal pure returns (uint256)
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

### _validateMTokenAmount

```solidity
function _validateMTokenAmount(address user, uint256 amountMToken) internal view returns (bool)
```

_validates that inputted mToken amount is >= minAmount()
only if the `user` is not free from min amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |
| amountMToken | uint256 | amount of mToken |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | isFreeFromMinAmount if the `user` is free from min amount |

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

### contractAdminRole

```solidity
function contractAdminRole() public view virtual returns (bytes32)
```

_main admin role for the contract_

### _validateFunctionAccessWithTimelock

```solidity
function _validateFunctionAccessWithTimelock(bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperator, address account, bool validateFunctionRole) internal view
```

_validates that the function access is valid with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| overrideDelay | uint32 | override delay for the invocation |
| roleIsFunctionOperator | bool | whether the role is a function operator |
| account | address | account to validate |
| validateFunctionRole | bool | whether to validate the function role |

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

### _requireSlippageNotExceeded

```solidity
function _requireSlippageNotExceeded(uint256 actualReceiveAmount, uint256 minReceiveAmount) internal pure
```

_validates that actual receive amount is greater than or equal to minimum receive amount_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| actualReceiveAmount | uint256 | actual receive amount |
| minReceiveAmount | uint256 | minimum receive amount |

### _validateMaxApproveRequestId

```solidity
function _validateMaxApproveRequestId(uint256 requestId, bool revertIfInvalid) internal view returns (bool isValid)
```

_validates that request id is less than or equal to max approve request id_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| revertIfInvalid | bool |  |

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
event SetSanctionsList(address newSanctionsList)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSanctionsList | address | new address of `sanctionsList` |

### Sanctioned

```solidity
error Sanctioned(address user)
```

when user is sanctioned on sanctions list contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | user address |

### onlyNotSanctioned

```solidity
modifier onlyNotSanctioned(address user)
```

_checks that a given `user` is not sanctioned_

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

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSanctionsList | address | new sanctions list address |

## Blacklistable

Base contract that implements basic functions and modifiers
to work with blacklistable

### onlyNotBlacklisted

```solidity
modifier onlyNotBlacklisted(address account)
```

_checks that a given `account` doesnt have blacklisted role_

### _onlyNotBlacklisted

```solidity
function _onlyNotBlacklisted(address account) internal view
```

_checks that a given `account` doesnt have blacklisted role_

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
event SetGreenlistEnable(bool enable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enable | bool | enable |

### onlyGreenlisted

```solidity
modifier onlyGreenlisted(address account)
```

_checks that a given `account` has `greenlistedRole()`_

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

## MidasAccessControl

Smart contract that stores all roles for Midas project

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

### isUserFacingRole

```solidity
mapping(bytes32 => bool) isUserFacingRole
```

roles that are held by users

### timelockManager

```solidity
address timelockManager
```

address of MidasAccessControlTimelockController contract

### pauseManager

```solidity
address pauseManager
```

address of MidasAccessControlTimelockController contract

### defaultDelay

```solidity
uint32 defaultDelay
```

default delay for all of the roles

### onlyRoleWithTimelock

```solidity
modifier onlyRoleWithTimelock(bytes32 role)
```

_validates that the msg.sender has the role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role to check access for |

### onlyRoleDelayOverride

```solidity
modifier onlyRoleDelayOverride(bytes32 role, uint32 overrideDelay)
```

_validates that the caller has the function role with timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | base role to validate |
| overrideDelay | uint32 | override delay for the invocation |

### initialize

```solidity
function initialize(uint32 _defaultDelay, bytes32[] _userFacingRoles) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultDelay | uint32 | default delay |
| _userFacingRoles | bytes32[] | array of additional user facing roles |

### initializeV2

```solidity
function initializeV2(uint32 _defaultDelay, bytes32[] _userFacingRoles) public
```

initializerV2. Initializes user facing roles

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultDelay | uint32 |  |
| _userFacingRoles | bytes32[] | array of additional user facing roles |

### initializeRelationships

```solidity
function initializeRelationships(address _timelockManager, address _pauseManager) external
```

initializes timelock manager. Moved to a searate initializer
as its 2-way dependency between the contracts.

_can be called only by DEFAULT_ADMIN_ROLE_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _timelockManager | address | address of the timelock manager |
| _pauseManager | address | address of the pause manager |

### setDefaultDelay

```solidity
function setDefaultDelay(uint32 _defaultDelay) external
```

Sets the default delay

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultDelay | uint32 | default delay in seconds |

### setRoleDelayMult

```solidity
function setRoleDelayMult(struct IMidasAccessControl.SetRoleDelayParams[] params) external
```

Sets timelock delay per role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetRoleDelayParams[] | array of SetRoleDelayParams |

### setUserFacingRoleMult

```solidity
function setUserFacingRoleMult(struct IMidasAccessControl.SetUserFacingRoleParams[] params) external
```

Enable or disable which OZ role may administer function-access scopes for that role.

_Only `DEFAULT_ADMIN_ROLE` can call this function.
Prevents unrelated role admins from spamming access mappings._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.SetUserFacingRoleParams[] | array of SetUserFacingRoleParams |

### setGrantOperatorRoleMult

```solidity
function setGrantOperatorRoleMult(address targetContract, struct IMidasAccessControl.SetGrantOperatorRoleParams[] params) external
```

Add or remove a grant operator for a specific contract function scope.

_`targetContract` must implement `IMidasAccessControlManaged` interface;
Caller must hold `contractAdminRole` of a target contract;_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targetContract | address | scoped contract |
| params | struct IMidasAccessControl.SetGrantOperatorRoleParams[] | array of SetGrantOperatorRoleParams |

### setPermissionRoleMult

```solidity
function setPermissionRoleMult(bytes32 masterRole, address targetContract, bytes4 functionSelector, uint32 delay, struct IMidasAccessControl.SetPermissionRoleParams[] params) public
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope or have the master role_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| delay | uint32 | delay value |
| params | struct IMidasAccessControl.SetPermissionRoleParams[] | array of SetPermissionRoleParams |

### setPermissionRoleMult

```solidity
function setPermissionRoleMult(address targetContract, bytes4 functionSelector, uint32 delay, struct IMidasAccessControl.SetPermissionRoleParams[] params) external
```

Grant or revoke function access for an account

_caller must be a grant operator for the scope or have the master role
target contract must implement `IMidasAccessControlManaged` interface;_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| delay | uint32 | delay value |
| params | struct IMidasAccessControl.SetPermissionRoleParams[] | array of SetPermissionRoleParams |

### grantRoleMult

```solidity
function grantRoleMult(struct IMidasAccessControl.GrantRoleMultParams[] params) external
```

grant multiple roles to multiple users in one transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.GrantRoleMultParams[] | array of GrantRoleMultParams |

### revokeRoleMult

```solidity
function revokeRoleMult(struct IMidasAccessControl.RevokeRoleMultParams[] params) external
```

revoke multiple roles from multiple users in one transaction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasAccessControl.RevokeRoleMultParams[] | array of RevokeRoleMultParams |

### grantRole

```solidity
function grantRole(bytes32 role, address account) public
```

_Grants `role` to `account`.

If `account` had not been already granted `role`, emits a {RoleGranted}
event.

Requirements:

- the caller must have ``role``'s admin role.

May emit a {RoleGranted} event._

### grantRole

```solidity
function grantRole(bytes32 role, address account, uint32 delay) public
```

Grant a role to an account with a delay

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role id |
| account | address | account to grant the role to |
| delay | uint32 | delay value |

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) public
```

_Revokes `role` from `account`.

If `account` had been granted `role`, emits a {RoleRevoked} event.

Requirements:

- the caller must have ``role``'s admin role.

May emit a {RoleRevoked} event._

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

renouce role is forbidden

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 masterRole, address targetContract, bytes4 functionSelector, address operator) external view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### isFunctionAccessGrantOperator

```solidity
function isFunctionAccessGrantOperator(bytes32 key, address operator) public view returns (bool)
```

Whether `operator` may call `setFunctionPermission` for the function scope

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | operator permission key |
| operator | address | address checked for grant-operator status |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `operator` is a grant operator for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 masterRole, address targetContract, bytes4 functionSelector, address account) external view returns (bool)
```

Whether `account` may call the scoped function on `targetContract`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role for the scope |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function |
| account | address | address checked for permissio. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

### hasFunctionPermission

```solidity
function hasFunctionPermission(bytes32 key, address account) external view returns (bool)
```

Whether `account` has function access for the scope.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | the base key for function permission mappings |
| account | address | address checked for permission |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | allowed whether `account` has function access for the scope |

### permissionRoleKey

```solidity
function permissionRoleKey(bytes32 masterRole, address targetContract, bytes4 functionSelector) public pure returns (bytes32)
```

calculates the base key for function permission mappings

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function of a `targetContract` |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | key the base key for function permission mappings |

### grantOperatorRoleKey

```solidity
function grantOperatorRoleKey(bytes32 masterRole, address targetContract, bytes4 functionSelector) public pure returns (bytes32)
```

calculates the base key for function permission mappings

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | OZ role |
| targetContract | address | scoped contract |
| functionSelector | bytes4 | scoped function of a `targetContract` |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | key the base key for function permission mappings |

### getRoleTimelockDelay

```solidity
function getRoleTimelockDelay(bytes32 role, uint32 overrideDelay) public view returns (uint32, bool)
```

Returns timelock delay for a role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role id |
| overrideDelay | uint32 | override delay for the invocation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 |  |
| [1] | bool |  |

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

returns the role that can pause the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role role descriptor |

### _validateRoleAccess

```solidity
function _validateRoleAccess(bytes32 role, uint32 overrideDelay) internal view returns (address)
```

validates that the msg.sender with a role has access to the function

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role to check access for |
| overrideDelay | uint32 | override delay for the invocation |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | actualAccount actual account that has access to the function |

### _validateRoleAccess

```solidity
function _validateRoleAccess(bytes32 role) internal view returns (address)
```

validates that the msg.sender with a role has access to the function

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | role to check access for |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | actualAccount actual account that has access to the function |

### _validateOperatorRoleAccess

```solidity
function _validateOperatorRoleAccess(bytes32 masterRole, bytes32 operatorRole, address account) internal view
```

_validates that the account with a master or operator role has access to the function
selects a role with a shortest delay in case if has both roles_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | master role |
| operatorRole | bytes32 | operator role |
| account | address | account to check access for |

### _resolveOperatorRole

```solidity
function _resolveOperatorRole(bytes32 masterRole, bytes32 operatorRole, address account) internal view returns (bytes32)
```

_validates that the account has either operator or master role and uses the role with a shortest delay_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| masterRole | bytes32 | master role |
| operatorRole | bytes32 | operator role |
| account | address | account to check access for |

## MidasPauseManager

Global manager for pausing and unpausing functions

### DELAY_FOR_SET_DELAY

```solidity
uint32 DELAY_FOR_SET_DELAY
```

static delay for setting pause delay

### contractPaused

```solidity
mapping(address => bool) contractPaused
```

contract => paused status

### contractFnPaused

```solidity
mapping(address => mapping(bytes4 => bool)) contractFnPaused
```

contract => function id => paused status

### pauseDelay

```solidity
uint32 pauseDelay
```

pause delay

### unpauseDelay

```solidity
uint32 unpauseDelay
```

unpause delay

### globalPaused

```solidity
bool globalPaused
```

global paused status

### onlyPausableContractAdminPause

```solidity
modifier onlyPausableContractAdminPause(address contractAddr)
```

_validates that caller has access to the `contractAddr` contract admin role
overrides delay for the invocation with pause delay_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### onlyPausableContractAdminUnpause

```solidity
modifier onlyPausableContractAdminUnpause(address contractAddr)
```

_validates that caller has access to the `contractAddr` contract admin role
overrides delay for the invocation with unpause delay_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### onlyAdminPause

```solidity
modifier onlyAdminPause()
```

_validates that caller has access to the pause admin role
overrides delay for the invocation with pause delay_

### onlyAdminUnpause

```solidity
modifier onlyAdminUnpause()
```

_validates that caller has access to the unpause admin role
overrides delay for the invocation with unpause delay_

### initialize

```solidity
function initialize(address _accessControl, uint32 _pauseDelay, uint32 _unpauseDelay) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControl contract |
| _pauseDelay | uint32 | pause delay |
| _unpauseDelay | uint32 | unpause delay |

### setPauseDelay

```solidity
function setPauseDelay(uint32 _pauseDelay) external
```

sets the pause delay

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pauseDelay | uint32 | pause delay |

### setUnpauseDelay

```solidity
function setUnpauseDelay(uint32 _unpauseDelay) external
```

sets the unpause delay

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _unpauseDelay | uint32 | unpause delay |

### globalPause

```solidity
function globalPause() external
```

pauses the protocol

_can be called only by the pause manager admin_

### globalUnpause

```solidity
function globalUnpause() external
```

unpauses the protocol

_can be called only by the pause manager admin_

### bulkPauseContract

```solidity
function bulkPauseContract(address[] contractAddrs) external
```

pauses an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |

### bulkUnpauseContract

```solidity
function bulkUnpauseContract(address[] contractAddrs) external
```

unpauses an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |

### bulkPauseContractFn

```solidity
function bulkPauseContractFn(address[] contractAddrs, bytes4[] selectors) external
```

pauses functions on an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |
| selectors | bytes4[] | function ids to pause on the contracts |

### bulkUnpauseContractFn

```solidity
function bulkUnpauseContractFn(address[] contractAddrs, bytes4[] selectors) external
```

unpauses functions on an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |
| selectors | bytes4[] | function ids to unpause on the contracts |

### contractAdminPause

```solidity
function contractAdminPause(address contractAddr) external
```

pauses a contract

_can be called only by admin of a contract or function admin that
is managed by the admin of the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### contractAdminUnpause

```solidity
function contractAdminUnpause(address contractAddr) external
```

unpauses a contract

_can be called only by admin of a contract or function admin that
is managed by the admin of the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### isPaused

```solidity
function isPaused(address contractAddr, bytes4 selector) external view returns (bool)
```

checks if function or contract or protocol is paused

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| selector | bytes4 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | paused true if paused |

### isFunctionPaused

```solidity
function isFunctionPaused(address contractAddr, bytes4 selector) public view returns (bool)
```

checks if function of a contract is paused

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| selector | bytes4 | function id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | paused true if the function is paused |

### pauseAdminRole

```solidity
function pauseAdminRole() public view returns (bytes32)
```

returns the admin role for the pause manager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role admin role |

### contractAdminRole

```solidity
function contractAdminRole() public pure returns (bytes32)
```

_main admin role for the contract_

## MidasTimelockManager

Manages timelock scheduling, security council votes and operation details

### TimelockOperationDetails

_internal storage for a timelock operation details_

```solidity
struct TimelockOperationDetails {
  struct EnumerableSetUpgradeable.AddressSet votersForExecution;
  struct EnumerableSetUpgradeable.AddressSet votersForVeto;
  uint256 councilVersion;
  bytes32 dataHash;
  enum TimelockOperationStatus status;
  uint8 pauseReasonCode;
  bool isSetCouncilOperation;
  uint32 createdAt;
  uint32 executionApprovedAt;
  address operationProposer;
  address pauser;
}
```

### TIMELOCK_OPERATION_PAUSER_ROLE

```solidity
bytes32 TIMELOCK_OPERATION_PAUSER_ROLE
```

role that can pause timelock operations

### SECURITY_COUNCIL_MANAGER_ROLE

```solidity
bytes32 SECURITY_COUNCIL_MANAGER_ROLE
```

role that can set security council

### SECURITY_COUNCIL_MIN_MEMBERS

```solidity
uint256 SECURITY_COUNCIL_MIN_MEMBERS
```

min security council members

### SECURITY_COUNCIL_MAX_MEMBERS

```solidity
uint256 SECURITY_COUNCIL_MAX_MEMBERS
```

max security council members

### EXPIRY_PERIOD

```solidity
uint256 EXPIRY_PERIOD
```

time after schedule when operation expires

### DISPUTE_PERIOD

```solidity
uint256 DISPUTE_PERIOD
```

dispute period after execution approval

### MAX_PENDING_OPERATIONS_PER_PROPOSER

```solidity
uint256 MAX_PENDING_OPERATIONS_PER_PROPOSER
```

hard cap for max pending operations per proposer

### dataHashIndexes

```solidity
mapping(bytes32 => uint256) dataHashIndexes
```

Data hash index used for operation id salt

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### proposerPendingOperationsCount

```solidity
mapping(address => uint256) proposerPendingOperationsCount
```

Pending operations count for a proposer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### timelock

```solidity
address timelock
```

Timelock controller address

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### maxPendingOperationsPerProposer

```solidity
uint256 maxPendingOperationsPerProposer
```

Max pending operations per proposer

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### securityCouncilVersion

```solidity
uint256 securityCouncilVersion
```

Current security council version

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### pendingSetCouncilOperationId

```solidity
bytes32 pendingSetCouncilOperationId
```

Pending set-security-council operation id, if any

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |

### onlyContractAdminNoTimelock

```solidity
modifier onlyContractAdminNoTimelock(bool validateFunctionRole)
```

_validates that the caller has the contract admin role without timelock_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validateFunctionRole | bool | whether to validate the function role |

### onlyContractAdminNoFunctionRole

```solidity
modifier onlyContractAdminNoFunctionRole()
```

_validates that the caller has the contract admin role without function role_

### initialize

```solidity
function initialize(address _accessControl, uint256 _maxPendingOperationsPerProposer, address[] _initSecurityCouncil) external
```

Initializes the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | MidasAccessControl address |
| _maxPendingOperationsPerProposer | uint256 | max pending ops per proposer |
| _initSecurityCouncil | address[] | initial security council members |

### initializeTimelock

```solidity
function initializeTimelock(address _timelock) external
```

Initializes the timelock controller

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _timelock | address | timelock controller address |

### setMaxPendingOperationsPerProposer

```solidity
function setMaxPendingOperationsPerProposer(uint256 _maxPendingOperationsPerProposer) external
```

Sets max pending operations per proposer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxPendingOperationsPerProposer | uint256 | new limit |

### setSecurityCouncil

```solidity
function setSecurityCouncil(address[] members) external
```

Sets a new security council version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| members | address[] | council member addresses |

### bulkScheduleTimelockOperation

```solidity
function bulkScheduleTimelockOperation(struct IMidasTimelockManager.ScheduleTimelockOperationParams[] params) external
```

Schedules multiple timelock operations

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasTimelockManager.ScheduleTimelockOperationParams[] | array of schedule timelock operation parameters |

### scheduleTimelockOperation

```solidity
function scheduleTimelockOperation(struct IMidasTimelockManager.ScheduleTimelockOperationParams params) external
```

Schedules one timelock operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| params | struct IMidasTimelockManager.ScheduleTimelockOperationParams | schedule timelock operation parameters |

### executeTimelockOperation

```solidity
function executeTimelockOperation(address target, bytes data, bool revertOnFailure) external
```

Executes a scheduled timelock operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |
| revertOnFailure | bool | true if execution should revert on failure |

### pauseOperation

```solidity
function pauseOperation(bytes32 operationId, uint8 pauseReasonCode) external
```

Pauses a pending operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |
| pauseReasonCode | uint8 | reason code set by pauser |

### voteForVeto

```solidity
function voteForVeto(bytes32 operationId) external
```

Security council votes to abort the operation

_can vote even if member is already voted for execution_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### voteForExecution

```solidity
function voteForExecution(bytes32 operationId) external
```

Security council votes to allow execution

_cannot vote if member is already voted for veto_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### abortOperation

```solidity
function abortOperation(bytes32 operationId) external
```

Aborts operation after veto quorum or expiry

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### getOriginalProposer

```solidity
function getOriginalProposer(address target, bytes data) external view returns (address)
```

Returns original proposer for a pending operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | proposer address |

### councilQuorum

```solidity
function councilQuorum(uint256 version) public view returns (uint8)
```

Votes needed for council quorum at a version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 |  |

### getCouncilMemberVoteStatus

```solidity
function getCouncilMemberVoteStatus(bytes32 operationId, address councilMember) external view returns (bool votedForExecution, bool votedForVeto)
```

Whether a council member voted on an operation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |
| councilMember | address | member address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| votedForExecution | bool | true if voted for execution |
| votedForVeto | bool | true if voted for veto |

### getPendingOperations

```solidity
function getPendingOperations() external view returns (bytes32[])
```

Returns all pending operation ids

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32[] |  |

### getOperationDetails

```solidity
function getOperationDetails(bytes32 operationId) external view returns (struct GetOperationStatusResult result)
```

Returns full operation details

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| result | struct GetOperationStatusResult | operation details |

### getOperationStatus

```solidity
function getOperationStatus(bytes32 operationId) external view returns (enum TimelockOperationStatus status)
```

Returns operation status (with expiry/dispute rules applied)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum TimelockOperationStatus | current status |

### getOperationStatusRaw

```solidity
function getOperationStatusRaw(bytes32 operationId) external view returns (enum TimelockOperationStatus status)
```

Returns stored operation status without adjustments

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum TimelockOperationStatus | stored status |

### getSecurityCouncilMembers

```solidity
function getSecurityCouncilMembers(uint256 version) external view returns (address[])
```

Returns security council members for a version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] |  |

### getOperationId

```solidity
function getOperationId(address target, bytes data) external view returns (bytes32 operationId)
```

Returns operation id for target and data

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| operationId | bytes32 | operation id |

### getTargetRole

```solidity
function getTargetRole(address target, bytes data, address proposer) public view returns (bytes32, uint32)
```

_gets the target role for a given operation_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| target | address | target contract |
| data | bytes | operation data |
| proposer | address | operation proposer address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 |  |
| [1] | uint32 |  |

### isInSecurityCouncil

```solidity
function isInSecurityCouncil(uint256 version, address account) public view returns (bool)
```

Checks if an account is in the security council for a given version

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| version | uint256 | security council version |
| account | address | account to check |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the account is in the security council |

### contractAdminRole

```solidity
function contractAdminRole() public pure returns (bytes32)
```

_main admin role for the contract_

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

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | int256 | data value |
| roundId | uint256 | round id |
| timestamp | uint256 | timestamp |

### MaxAnswerDeviationUpdated

```solidity
event MaxAnswerDeviationUpdated(uint256 maxAnswerDeviation)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| maxAnswerDeviation | uint256 | the new max answer deviation |

### SetMinMaxAnswer

```solidity
event SetMinMaxAnswer(int192 minAnswer, int192 maxAnswer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minAnswer | int192 | the new min answer |
| maxAnswer | int192 | the new max answer |

### constructor

```solidity
constructor(bytes32 _contractAdminRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |

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

### setMinMaxAnswer

```solidity
function setMinMaxAnswer(int192 _minAnswer, int192 _maxAnswer) external
```

sets the min and max answer

_the min and max answer are the minimum and maximum allowed values for the answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minAnswer | int192 | the new min answer |
| _maxAnswer | int192 | the new max answer |

### setRoundDataSafe

```solidity
function setRoundDataSafe(int256 _data) external
```

works as `setRoundData()`, but also checks the
deviation with the lattest submitted data, and that at least
1 hour passed since the lattest submission

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
Function should be called only from address with `contractAdminRole()`_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _data | int256 | data value |

### setMaxAnswerDeviation

```solidity
function setMaxAnswerDeviation(uint256 _maxAnswerDeviation) external
```

sets the max answer deviation

_the max answer deviation is the maximum allowed deviation from the latest price_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxAnswerDeviation | uint256 | the new max answer deviation |

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

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

## Request

Mint request scruct

```solidity
struct Request {
  address recipient;
  address tokenIn;
  enum RequestStatus status;
  uint256 depositedUsdAmount;
  uint256 usdAmountWithoutFees;
  uint256 tokenOutRate;
  uint256 depositedInstantUsdAmount;
  uint256 approvedTokenOutRate;
  uint256 amountMToken;
}
```

## DepositVaultInitParams

Deposit vault init params

```solidity
struct DepositVaultInitParams {
  uint256 minMTokenAmountForFirstDeposit;
  uint256 maxSupplyCap;
  uint256 maxAmountPerRequest;
}
```

## IDepositVault

### SetMinMTokenAmountForFirstDeposit

```solidity
event SetMinMTokenAmountForFirstDeposit(uint256 newValue)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new min amount to deposit value |

### SetMaxSupplyCap

```solidity
event SetMaxSupplyCap(uint256 newValue)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max supply cap value |

### SetMaxAmountPerRequest

```solidity
event SetMaxAmountPerRequest(uint256 newValue)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max amount per request |

### DepositInstant

```solidity
event DepositInstant(address user, address tokenIn, address recipient, uint256 amountTokenIn, uint256 feeAmount, uint256 amountMToken, uint256 mTokenRate, uint256 tokenInRate, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| recipient | address | address that receives the mTokens |
| amountTokenIn | uint256 | amount of tokenIn |
| feeAmount | uint256 | fee amount in tokenIn |
| amountMToken | uint256 | amount of minted mTokens |
| mTokenRate | uint256 | mToken rate |
| tokenInRate | uint256 | tokenIn rate |
| referrerId | bytes32 | referrer id |

### DepositRequest

```solidity
event DepositRequest(uint256 requestId, address user, address tokenIn, address recipient, uint256 amountTokenIn, uint256 amountTokenInInstant, uint256 feeAmount, uint256 mTokenRate, uint256 tokenInRate, bytes32 referrerId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| user | address | function caller (msg.sender) |
| tokenIn | address | address of tokenIn |
| recipient | address | address that receives the mTokens |
| amountTokenIn | uint256 | amount of tokenIn |
| amountTokenInInstant | uint256 | amount of tokenIn that was deposited instantly |
| feeAmount | uint256 | fee amount in tokenIn |
| mTokenRate | uint256 | mToken rate |
| tokenInRate | uint256 | tokenIn rate |
| referrerId | bytes32 | referrer id |

### ApproveRequest

```solidity
event ApproveRequest(uint256 requestId, uint256 newOutRate, bool isSafe, bool isAvgRate)
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
event RejectRequest(uint256 requestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |

### LessThanMinAmountFirstDeposit

```solidity
error LessThanMinAmountFirstDeposit(uint256 amountMTokenWithoutFee, uint256 minAmount)
```

first deposit mint amount is below minimum

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountMTokenWithoutFee | uint256 | mint amount after fee (decimals 18) |
| minAmount | uint256 | minimum first deposit mint amount |

### SupplyCapExceeded

```solidity
error SupplyCapExceeded()
```

when token supply cap is exceeded

### MaxAmountPerRequestExceeded

```solidity
error MaxAmountPerRequestExceeded(uint256 estimatedMintAmount)
```

when max amount per request is exceeded

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| estimatedMintAmount | uint256 | estimated mint amount |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId) external returns (uint256)
```

depositing proccess with auto mint if
account fit daily limit and token allowance.
Transfers token from the user.
Transfers fee in tokenIn to tokensReceiver.
Mints mToken to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIn | address | address of tokenIn |
| amountToken | uint256 | amount of `tokenIn` that will be taken from user (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of mToken to receive (decimals 18) |
| referrerId | bytes32 | referrer id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | mintAmount amount of mToken that was minted |

### depositInstant

```solidity
function depositInstant(address tokenIn, uint256 amountToken, uint256 minReceiveAmount, bytes32 referrerId, address tokensReceiver) external returns (uint256)
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

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | mintAmount amount of mToken that was minted |

### depositRequest

```solidity
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId) external returns (uint256)
```

depositing proccess with mint request creating if
account fit token allowance.
Transfers token from the user.
Transfers fee in tokenIn to tokensReceiver.
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
function depositRequest(address tokenIn, uint256 amountToken, bytes32 referrerId, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256, uint256)
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
| [1] | uint256 | instantMintAmount amount of mToken that was minted instantly |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array
with the mToken rate from the request.
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
Mints mToken to request users.
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newOutRate, bool isAvgRate) external
```

approving request without price deviation check
Mints mToken to user.
Sets request flag to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| newOutRate | uint256 | mToken rate inputted by vault admin |
| isAvgRate | bool | if true, newOutRate is avg rate |

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

### setMaxAmountPerRequest

```solidity
function setMaxAmountPerRequest(uint256 newValue) external
```

sets new max amount per request
can be called only from vault`s admin

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newValue | uint256 | new max amount per request |

## IMToken

### ClawbackReceiverSet

```solidity
event ClawbackReceiverSet(address clawbackReceiver)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| clawbackReceiver | address | address to which clawback tokens will be sent |

### SetNameSymbol

```solidity
event SetNameSymbol(string name, string symbol)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | new name |
| symbol | string | new symbol |

### SetIsPermissioned

```solidity
event SetIsPermissioned(bool isPermissioned)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| isPermissioned | bool | if true then the token is permissioned |

### SetIsMinHoldingBalanceEnforced

```solidity
event SetIsMinHoldingBalanceEnforced(bool isMinHoldingBalanceEnforced)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| isMinHoldingBalanceEnforced | bool | if true then the token has a minimum holding balance enforced |

### SetMetadata

```solidity
event SetMetadata(bytes32 key, bytes data)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | bytes32 | metadata key |
| data | bytes | metadata data |

### Clawback

```solidity
event Clawback(address from, address to, uint256 amount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | address to clawback tokens from |
| to | address | address to clawback tokens to |
| amount | uint256 | amount to clawback |

### InvalidNewLimit

```solidity
error InvalidNewLimit(uint256 newLimit, uint256 existingLimit)
```

when new limit is invalid

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLimit | uint256 | new limit |
| existingLimit | uint256 | existing limit |

### MinBalanceNotMet

```solidity
error MinBalanceNotMet(uint256 balance)
```

when the balance is not met

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| balance | uint256 | balance |

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mToken token `amount` to a given `to` address.
should be called only from permissioned actor
bypasses the timelock entirely

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns mToken token `amount` from a given `from` address.
should be called only from permissioned actor
bypasses the timelock entirely

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### mintGoverned

```solidity
function mintGoverned(address to, uint256 amount) external
```

mints mToken token `amount` to a given `to` address,
requires the timelock to pass
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | address to mint tokens to |
| amount | uint256 | amount to mint |

### burnGoverned

```solidity
function burnGoverned(address from, uint256 amount) external
```

burns mToken token `amount` from a given `from` address,
bypassing blacklist checks.
requires the timelock to pass
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | address to burn tokens from |
| amount | uint256 | amount to burn |

### clawback

```solidity
function clawback(uint256 amount, address from) external
```

claws back tokens from a given address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount to clawback |
| from | address | address to clawback tokens from |

### setClawbackReceiver

```solidity
function setClawbackReceiver(address clawbackReceiver) external
```

sets the address to which clawback tokens will be sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| clawbackReceiver | address | address to which clawback tokens will be sent |

### setNameSymbol

```solidity
function setNameSymbol(string name_, string symbol_) external
```

sets the name and symbol of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name_ | string | new name |
| symbol_ | string | new symbol |

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

### increaseMintRateLimit

```solidity
function increaseMintRateLimit(uint256 window, uint256 newLimit) external
```

increases mint rate limit for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| newLimit | uint256 | limit amount per window |

### decreaseMintRateLimit

```solidity
function decreaseMintRateLimit(uint256 window, uint256 newLimit) external
```

decreases mint rate limit for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| newLimit | uint256 | limit amount per window |

### removeMintRateLimitConfig

```solidity
function removeMintRateLimitConfig(uint256 window) external
```

removes mint rate limit config for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

### setIsPermissioned

```solidity
function setIsPermissioned(bool isPermissioned) external
```

sets the permissioned status of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| isPermissioned | bool | if true then the token is permissioned |

### setMinHoldingBalanceEnforced

```solidity
function setMinHoldingBalanceEnforced(bool isMinHoldingBalanceEnforced) external
```

sets the min holding balance enforced status of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| isMinHoldingBalanceEnforced | bool | if true then the token has a minimum holding balance enforced |

### minBalanceExemptRole

```solidity
function minBalanceExemptRole() external view returns (bytes32)
```

role that grants min balance exempt rights to the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### greenlistedRole

```solidity
function greenlistedRole() external view returns (bytes32)
```

sets the role that grants greenlisted rights to the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## TokenConfig

Payment token config

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

## CommonVaultInitParams

Common vault init params

```solidity
struct CommonVaultInitParams {
  uint256 variationTolerance;
  uint256 minAmount;
  uint256 instantFee;
  address ac;
  address sanctionsList;
  address mToken;
  address mTokenDataFeed;
  address tokensReceiver;
  uint256 minInstantFee;
  uint256 maxInstantFee;
  uint256 maxInstantShare;
  uint256 maxApproveRequestId;
  bool sequentialRequestProcessing;
}
```

## IManageableVault

### WithdrawToken

```solidity
event WithdrawToken(address token, address withdrawTo, uint256 amount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token that was withdrawn |
| withdrawTo | address | address to which tokens were withdrawn |
| amount | uint256 | `token` transfer amount |

### AddPaymentToken

```solidity
event AddPaymentToken(address token, address dataFeed, uint256 fee, uint256 allowance, bool stable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| dataFeed | address | token dataFeed address |
| fee | uint256 | fee 1% = 100 |
| allowance | uint256 | token allowance (decimals 18) |
| stable | bool | stablecoin flag |

### ChangeTokenAllowance

```solidity
event ChangeTokenAllowance(address token, uint256 allowance)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| allowance | uint256 | new allowance |

### ChangeTokenFee

```solidity
event ChangeTokenFee(address token, uint256 fee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |
| fee | uint256 | new fee |

### RemovePaymentToken

```solidity
event RemovePaymentToken(address token)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | address of token that |

### SetWaivedFeeAccount

```solidity
event SetWaivedFeeAccount(address account, bool enable)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | address of account |
| enable | bool | is enabled |

### SetInstantFee

```solidity
event SetInstantFee(uint256 newFee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFee | uint256 | new operation fee value |

### SetMinMaxInstantFee

```solidity
event SetMinMaxInstantFee(uint256 newMinInstantFee, uint256 newMaxInstantFee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinInstantFee | uint256 | new minimum instant fee |
| newMaxInstantFee | uint256 | new maximum instant fee |

### SetMinAmount

```solidity
event SetMinAmount(uint256 newAmount)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAmount | uint256 | new min amount for operation |

### SetMaxInstantShare

```solidity
event SetMaxInstantShare(uint256 newMaxInstantShare)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxInstantShare | uint256 | new maximum instant share value in basis points (100 = 1%) |

### SetVariationTolerance

```solidity
event SetVariationTolerance(uint256 newTolerance)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newTolerance | uint256 | percent of price diviation 1% = 100 |

### SetTokensReceiver

```solidity
event SetTokensReceiver(address receiver)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | new receiver address |

### SetMaxApproveRequestId

```solidity
event SetMaxApproveRequestId(uint256 newMaxApproveRequestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
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

### SetSequentialRequestProcessing

```solidity
event SetSequentialRequestProcessing(bool enforce)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enforce | bool | enforce sequential request processing flag |

### PaymentTokenAlreadyAdded

```solidity
error PaymentTokenAlreadyAdded(address token)
```

Payment token is already added

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### PaymentTokenNotExists

```solidity
error PaymentTokenNotExists(address token)
```

Payment token is not in the list

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### SameAddressValue

```solidity
error SameAddressValue(address account)
```

Value is the same as the current one

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account address |

### InvalidMinMaxInstantFee

```solidity
error InvalidMinMaxInstantFee(uint256 minFee, uint256 maxFee)
```

Min instant fee is greater than max instant fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minFee | uint256 | minimum instant fee |
| maxFee | uint256 | maximum instant fee |

### InvalidRounding

```solidity
error InvalidRounding(uint256 amount, uint256 requiredAmount)
```

Amount does not match token decimals after rounding

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | input amount |
| requiredAmount | uint256 | amount after round-trip conversion |

### UnknownPaymentToken

```solidity
error UnknownPaymentToken(address token)
```

Payment token is not supported

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | token address |

### AllowanceExceeded

```solidity
error AllowanceExceeded(uint256 prevAllowance, uint256 amount)
```

Operation amount exceeds token allowance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| prevAllowance | uint256 | current allowance |
| amount | uint256 | requested amount |

### InstantFeeOutOfBounds

```solidity
error InstantFeeOutOfBounds(uint256 instantFee)
```

Instant fee is outside min/max range

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| instantFee | uint256 | current instant fee |

### PriceVariationExceeded

```solidity
error PriceVariationExceeded(uint256 difPercent, uint256 variationTolerance)
```

Price change is too large

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| difPercent | uint256 | actual price change percent (1% = 100) |
| variationTolerance | uint256 | max allowed change percent (1% = 100) |

### InvalidFee

```solidity
error InvalidFee(uint256 fee)
```

Fee is out of allowed range

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | fee value (1% = 100) |

### InvalidTokenRate

```solidity
error InvalidTokenRate(uint256 tokenRate)
```

Token rate is zero or invalid

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenRate | uint256 | token rate value |

### SlippageExceeded

```solidity
error SlippageExceeded(uint256 minReceiveAmount, uint256 actualReceiveAmount)
```

Received amount is below minimum

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| minReceiveAmount | uint256 | minimum expected amount |
| actualReceiveAmount | uint256 | actual received amount |

### RequestIdTooHigh

```solidity
error RequestIdTooHigh(uint256 requestId, uint256 maxApproveRequestId)
```

Request id is above max approve id

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| maxApproveRequestId | uint256 | max request id that can be approved |

### InvalidNewMTokenRate

```solidity
error InvalidNewMTokenRate()
```

New mToken rate must be greater than zero

### RequestNotExists

```solidity
error RequestNotExists(uint256 requestId)
```

Request does not exist

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### UnexpectedRequestStatus

```solidity
error UnexpectedRequestStatus(uint256 requestId, enum RequestStatus status)
```

Request has wrong status

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| status | enum RequestStatus | current request status |

### InstantShareTooHigh

```solidity
error InstantShareTooHigh(uint256 instantShare, uint256 maxInstantShare)
```

Instant share is above max allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| instantShare | uint256 | instant share in basis points (100 = 1%) |
| maxInstantShare | uint256 | max allowed instant share |

### InvalidAmount

```solidity
error InvalidAmount()
```

Amount must be greater than zero

### AmountLessThanMin

```solidity
error AmountLessThanMin(uint256 amount, uint256 minAmount)
```

Amount is below minimum

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | requested amount |
| minAmount | uint256 | minimum allowed amount |

### InvalidRequestSequence

```solidity
error InvalidRequestSequence(uint256 requestId, uint256 nextExpectedRequestIdToProcess)
```

Request id is not the next expected one

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| nextExpectedRequestIdToProcess | uint256 | next request id to process |

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

### setWaivedFeeAccount

```solidity
function setWaivedFeeAccount(address account, bool enable) external
```

sets a account to waived fee restriction.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | user address |
| enable | bool | is enabled |

### setTokensReceiver

```solidity
function setTokensReceiver(address receiver) external
```

set new receiver for tokens.
can be called only from permissioned actor.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | new token receiver address |

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
function setMinMaxInstantFee(uint256 newMinInstantFee, uint256 newMaxInstantFee) external
```

set new minimum/maximum instant fee

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMinInstantFee | uint256 | new minimum instant fee |
| newMaxInstantFee | uint256 | new maximum instant fee |

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
function setMaxInstantShare(uint256 newMaxInstantShare) external
```

set maximum instant share value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newMaxInstantShare | uint256 | new maximum instant share value in basis points (100 = 1%) |

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

### setSequentialRequestProcessing

```solidity
function setSequentialRequestProcessing(bool enforce) external
```

set enforce sequential request processing flag

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| enforce | bool | enforce sequential request processing flag |

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

### waivedFeeRestriction

```solidity
function waivedFeeRestriction(address account) external view returns (bool)
```

check if the account is waived from fee restriction

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | account address |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the account is waived from fee restriction, false otherwise |

## IMidasPauseManager

Interface for the MidasPauseManager

### FnPauseStatusChange

```solidity
event FnPauseStatusChange(address contractAddr, bytes4 fn, bool isPaused)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| fn | bytes4 | function id |
| isPaused | bool | paused status |

### ContractPauseStatusChange

```solidity
event ContractPauseStatusChange(address contractAddr, bool isPaused)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| isPaused | bool | paused status |

### GlobalPauseStatusChange

```solidity
event GlobalPauseStatusChange(bool isPaused)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| isPaused | bool | paused status |

### SetPauseDelay

```solidity
event SetPauseDelay(uint32 pauseDelay)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| pauseDelay | uint32 | pause delay |

### SetUnpauseDelay

```solidity
event SetUnpauseDelay(uint32 unpauseDelay)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| unpauseDelay | uint32 | unpause delay |

### setPauseDelay

```solidity
function setPauseDelay(uint32 _pauseDelay) external
```

sets the pause delay

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _pauseDelay | uint32 | pause delay |

### setUnpauseDelay

```solidity
function setUnpauseDelay(uint32 _unpauseDelay) external
```

sets the unpause delay

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _unpauseDelay | uint32 | unpause delay |

### globalPause

```solidity
function globalPause() external
```

pauses the protocol

_can be called only by the pause manager admin_

### globalUnpause

```solidity
function globalUnpause() external
```

unpauses the protocol

_can be called only by the pause manager admin_

### bulkPauseContract

```solidity
function bulkPauseContract(address[] contractAddrs) external
```

pauses an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |

### bulkUnpauseContract

```solidity
function bulkUnpauseContract(address[] contractAddrs) external
```

unpauses an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |

### bulkPauseContractFn

```solidity
function bulkPauseContractFn(address[] contractAddrs, bytes4[] selectors) external
```

pauses functions on an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |
| selectors | bytes4[] | function ids to pause on the contracts |

### bulkUnpauseContractFn

```solidity
function bulkUnpauseContractFn(address[] contractAddrs, bytes4[] selectors) external
```

unpauses functions on an array of contracts

_can be called only by the pause manager admin or function admin_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddrs | address[] | array of contract addresses |
| selectors | bytes4[] | function ids to unpause on the contracts |

### contractAdminPause

```solidity
function contractAdminPause(address contractAddr) external
```

pauses a contract

_can be called only by admin of a contract or function admin that
is managed by the admin of the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### contractAdminUnpause

```solidity
function contractAdminUnpause(address contractAddr) external
```

unpauses a contract

_can be called only by admin of a contract or function admin that
is managed by the admin of the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | address of the contract |

### isFunctionPaused

```solidity
function isFunctionPaused(address contractAddr, bytes4 selector) external view returns (bool)
```

checks if function of a contract is paused

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| selector | bytes4 | function id |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | paused true if the function is paused |

### isPaused

```solidity
function isPaused(address contractAddr, bytes4 selector) external view returns (bool)
```

checks if function or contract or protocol is paused

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| selector | bytes4 |  |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | paused true if paused |

### pauseAdminRole

```solidity
function pauseAdminRole() external view returns (bytes32)
```

returns the admin role for the pause manager

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role admin role |

### pauseDelay

```solidity
function pauseDelay() external view returns (uint32)
```

returns the pause delay

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 | pause delay |

### unpauseDelay

```solidity
function unpauseDelay() external view returns (uint32)
```

returns the unpause delay

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 | unpause delay |

## Request

Redeem request scruct

```solidity
struct Request {
  address recipient;
  address tokenOut;
  enum RequestStatus status;
  uint256 feePercent;
  uint256 amountMToken;
  uint256 mTokenRate;
  uint256 tokenOutRate;
  uint256 amountMTokenInstant;
  uint256 approvedMTokenRate;
  uint256 amountTokenOut;
}
```

## RedemptionVaultInitParams

Redemption vault init params

```solidity
struct RedemptionVaultInitParams {
  address requestRedeemer;
  address loanLp;
  address loanRepaymentAddress;
  address loanSwapperVault;
  uint256 loanApr;
}
```

## LiquidityProviderLoanRequest

Liquidity provider loan request struct

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

### RedeemInstant

```solidity
event RedeemInstant(address user, address tokenOut, address recipient, uint256 amountMToken, uint256 feeAmount, uint256 amountTokenOut, uint256 mTokenRate, uint256 tokenOutRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address | recipient address |
| amountMToken | uint256 | amount of mToken |
| feeAmount | uint256 | fee amount in tokenOut |
| amountTokenOut | uint256 | amount of tokenOut |
| mTokenRate | uint256 | mToken rate |
| tokenOutRate | uint256 | tokenOut rate |

### RedeemRequest

```solidity
event RedeemRequest(uint256 requestId, address user, address tokenOut, address recipient, uint256 amountMToken, uint256 amountMTokenInstant, uint256 feePercent, uint256 mTokenRate, uint256 tokenOutRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| user | address | function caller (msg.sender) |
| tokenOut | address | address of tokenOut |
| recipient | address | recipient address |
| amountMToken | uint256 | amount of mToken |
| amountMTokenInstant | uint256 | amount of mToken that was redeemed instantly |
| feePercent | uint256 | fee percent |
| mTokenRate | uint256 | mToken rate |
| tokenOutRate | uint256 | tokenOut rate |

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

### ApproveRequest

```solidity
event ApproveRequest(uint256 requestId, uint256 newMTokenRate, bool isSafe, bool isAvgRate)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |
| newMTokenRate | uint256 | new mToken rate |
| isSafe | bool | if true, approval is safe |
| isAvgRate | bool | if true, newMTokenRate is avg rate |

### RejectRequest

```solidity
event RejectRequest(uint256 requestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | mint request id |

### SetRequestRedeemer

```solidity
event SetRequestRedeemer(address redeemer)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| redeemer | address | new address of request redeemer |

### SetLoanLp

```solidity
event SetLoanLp(address newLoanLp)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLp | address | new address of loan liquidity provider |

### SetLoanRepaymentAddress

```solidity
event SetLoanRepaymentAddress(address newLoanRepaymentAddress)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanRepaymentAddress | address | new address of loan repayment address |

### SetLoanSwapperVault

```solidity
event SetLoanSwapperVault(address newLoanSwapperVault)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanSwapperVault | address | new address of loan swapper vault |

### SetLoanApr

```solidity
event SetLoanApr(uint256 newLoanApr)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanApr | uint256 | new loan APR value in basis points (100 = 1%) |

### SetPreferLoanLiquidity

```solidity
event SetPreferLoanLiquidity(bool newLoanLpFirst)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanLpFirst | bool | new flag to determine if the loan LP liquidity should be used first |

### RepayLpLoanRequest

```solidity
event RepayLpLoanRequest(uint256 requestId, uint256 amountFee)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |
| amountFee | uint256 | amount of fee in tokenOut |

### CancelLpLoanRequest

```solidity
event CancelLpLoanRequest(uint256 requestId)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestId | uint256 | request id |

### FeeExceedsAmount

```solidity
error FeeExceedsAmount(uint256 fee, uint256 amount)
```

when fee exceeds amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | fee |
| amount | uint256 | amount |

### NotSelfCall

```solidity
error NotSelfCall()
```

when not self call

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount) external returns (uint256)
```

redeem mToken to tokenOut if daily limit and allowance not exceeded
Burns mToken from the user.
Transfers tokenOut to user.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountTokenOut amount of tokenOut that was received in original decimals |

### redeemInstant

```solidity
function redeemInstant(address tokenOut, uint256 amountMTokenIn, uint256 minReceiveAmount, address recipient) external returns (uint256)
```

Does the same as original `redeemInstant` but allows specifying a custom tokensReceiver address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenOut | address | stable coin token address to redeem to |
| amountMTokenIn | uint256 | amount of mToken to redeem (decimals 18) |
| minReceiveAmount | uint256 | minimum expected amount of tokenOut to receive (decimals 18) |
| recipient | address | address that receives tokens |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | amountTokenOut amount of tokenOut that was received in original decimals |

### redeemRequest

```solidity
function redeemRequest(address tokenOut, uint256 amountMTokenIn) external returns (uint256)
```

creating redeem request
Transfers amount in mToken to contract

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
function redeemRequest(address tokenOut, uint256 amountMTokenIn, address recipientRequest, uint256 instantShare, uint256 minReceiveAmountInstantShare, address recipientInstant) external returns (uint256, uint256)
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
| [1] | uint256 | instantReceivedAmount amount of tokenOut that was received instantly in original decimals |

### safeBulkApproveRequestAtSavedRate

```solidity
function safeBulkApproveRequestAtSavedRate(uint256[] requestIds) external
```

approving requests from the `requestIds` array with the mToken rate
from the request. WONT fail even if there is not enough liquidity
to process all requests.
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
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
Validates that new mToken rate does not exceed variation tolerance
Transfers tokenOut to user
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |
| avgMTokenRate | uint256 | avg mToken rate inputted by vault admin |

### approveRequest

```solidity
function approveRequest(uint256 requestId, uint256 newMTokenRate, bool isAvgRate) external
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
| isAvgRate | bool | if true, newMTokenRate is avg rate |

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
function bulkRepayLpLoanRequest(uint256[] requestIds) external
```

repaying loan requests from the `requestIds` array
Transfers tokenOut to loan repayment address
Sets request flags to Processed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| requestIds | uint256[] | request ids array |

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

### setLoanApr

```solidity
function setLoanApr(uint256 newLoanApr) external
```

set loan APR value in basis points (100 = 1%)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newLoanApr | uint256 | new loan APR value in basis points (100 = 1%) |

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

Chainalysis sanctions oracle interface

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

## PauseGuardsLibrary

library for checking pause statuses

### Paused

```solidity
error Paused(address contractAddr, bytes4 fn)
```

error thrown when a function is paused

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddr | address | contract address |
| fn | bytes4 | function id |

### requireFnNotPaused

```solidity
function requireFnNotPaused(contract IMidasAccessControl accessControl, bytes4 fn) internal view
```

_checks that a given `fn` is not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl |  |
| fn | bytes4 | function id |

### requireNotPaused

```solidity
function requireNotPaused(contract IMidasAccessControl accessControl, bytes4 fn) internal view
```

_checks that a given `fn` and contract/global are not paused_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| accessControl | contract IMidasAccessControl |  |
| fn | bytes4 | function id |

## RateLimitLibrary

Multi-window linear-decay rate limiting (vault instant flows, mToken mint, etc.).

### WindowLimitExceeded

```solidity
error WindowLimitExceeded(uint256 window, uint256 remaining, uint256 requested)
```

when window limit is exceeded

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| remaining | uint256 | actual remaining amount |
| requested | uint256 | requested amount |

### UnknownWindowLimit

```solidity
error UnknownWindowLimit(uint256 window)
```

when window limit is unknown

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

### WindowTooShort

```solidity
error WindowTooShort(uint256 window)
```

when window is too short

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

### WindowLimitSet

```solidity
event WindowLimitSet(uint256 window, uint256 limit)
```

Emitted when a window limit is set or updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| limit | uint256 | max amount per window |

### WindowLimitRemoved

```solidity
event WindowLimitRemoved(uint256 window)
```

Emitted when a window limit is removed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

### WindowRateLimitConfig

Per-window rate limit (linear decay over `window` seconds).

```solidity
struct WindowRateLimitConfig {
  uint256 limit;
  uint256 amountInFlight;
  uint256 lastUpdated;
  uint256 window;
}
```

### WindowRateLimits

Active windows and their configs (keyed by window duration).

```solidity
struct WindowRateLimits {
  struct EnumerableSetUpgradeable.UintSet windows;
  mapping(uint256 => struct RateLimitLibrary.WindowRateLimitConfig) configs;
}
```

### WindowRateLimitStatus

Snapshot for one window (view helper).

```solidity
struct WindowRateLimitStatus {
  uint256 inFlight;
  uint256 remaining;
  uint256 lastUpdated;
  uint256 window;
  uint256 limit;
}
```

### getWindowStatuses

```solidity
function getWindowStatuses(struct RateLimitLibrary.WindowRateLimits limits) internal view returns (struct RateLimitLibrary.WindowRateLimitStatus[] statuses)
```

Returns a status row per configured window (enumeration order).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limits | struct RateLimitLibrary.WindowRateLimits | aggregated window state |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| statuses | struct RateLimitLibrary.WindowRateLimitStatus[] | one entry per active window |

### setWindowLimit

```solidity
function setWindowLimit(struct RateLimitLibrary.WindowRateLimits limits, uint256 window, uint256 limit) internal returns (uint256 previousLimit)
```

Sets or updates the limit for a window (checkpoints first).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limits | struct RateLimitLibrary.WindowRateLimits | aggregated window state |
| window | uint256 | window duration in seconds |
| limit | uint256 | max amount per window |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| previousLimit | uint256 | previous limit |

### removeWindowLimit

```solidity
function removeWindowLimit(struct RateLimitLibrary.WindowRateLimits limits, uint256 window) internal
```

Removes a window and clears its config.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limits | struct RateLimitLibrary.WindowRateLimits | aggregated window state |
| window | uint256 | window duration in seconds |

### consumeLimit

```solidity
function consumeLimit(struct RateLimitLibrary.WindowRateLimits limits, uint256 amount) internal
```

Charges `amount` against every window (reverts if any lacks headroom).

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| limits | struct RateLimitLibrary.WindowRateLimits | aggregated window state |
| amount | uint256 | amount to charge |

## RedemptionSwapperHelpersLibrary

### getSwapperDetails

```solidity
function getSwapperDetails(contract IRedemptionVault _redemptionVault, address _getBalanceOf) internal view returns (uint256 mTokenARate, contract IERC20Upgradeable mTokenA, uint256 mTokenABalance)
```

### redeemInstantSwapper

```solidity
function redeemInstantSwapper(contract IRedemptionVault _swapperVault, contract IERC20Upgradeable _mTokenA, address _liquiditySource, address _tokenOut, uint256 _mTokenAAmount, uint256 _tokenOutDecimals) internal returns (uint256)
```

## mToken

### metadata

```solidity
mapping(bytes32 => bytes) metadata
```

metadata key => metadata value

### clawbackReceiver

```solidity
address clawbackReceiver
```

address to which clawback tokens will be sent

### isPermissioned

```solidity
bool isPermissioned
```

if true then the token is permissioned

### isMinHoldingBalanceEnforced

```solidity
bool isMinHoldingBalanceEnforced
```

if true then the token has a minimum holding balance enforced

### constructor

```solidity
constructor(bytes32 _contractAdminRole, bytes32 _minterRole, bytes32 _burnerRole, bytes32 _greenlistedRole, bytes32 _minBalanceExemptRole) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractAdminRole | bytes32 | contract admin role |
| _minterRole | bytes32 | minter role |
| _burnerRole | bytes32 | burner role |
| _greenlistedRole | bytes32 | greenlisted role |
| _minBalanceExemptRole | bytes32 | min balance exempt role |

### initialize

```solidity
function initialize(address _accessControl, address _clawbackReceiver, bool _isPermissioned, bool _isMinHoldingBalanceEnforced, string name_, string symbol_) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _accessControl | address | address of MidasAccessControll contract |
| _clawbackReceiver | address | address to which clawback tokens will be sent |
| _isPermissioned | bool |  |
| _isMinHoldingBalanceEnforced | bool |  |
| name_ | string | name of the token |
| symbol_ | string | symbol of the token |

### initializeV3

```solidity
function initializeV3(address _clawbackReceiver, bool _isPermissioned, bool _isMinHoldingBalanceEnforced) public
```

v3 initializer

_not v2 because some of the original product mTokens were upgraded to v2 already_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _clawbackReceiver | address | address to which clawback tokens will be sent |
| _isPermissioned | bool | if true then the token is permissioned |
| _isMinHoldingBalanceEnforced | bool | if true then the token has a minimum holding balance enforced |

### setNameSymbol

```solidity
function setNameSymbol(string name_, string symbol_) external
```

sets the name and symbol of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name_ | string | new name |
| symbol_ | string | new symbol |

### setIsPermissioned

```solidity
function setIsPermissioned(bool _isPermissioned) external
```

sets the permissioned status of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _isPermissioned | bool |  |

### setMinHoldingBalanceEnforced

```solidity
function setMinHoldingBalanceEnforced(bool _isMinHoldingBalanceEnforced) external
```

sets the min holding balance enforced status of the token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _isMinHoldingBalanceEnforced | bool |  |

### setClawbackReceiver

```solidity
function setClawbackReceiver(address _clawbackReceiver) external
```

sets the address to which clawback tokens will be sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _clawbackReceiver | address |  |

### mint

```solidity
function mint(address to, uint256 amount) external
```

mints mToken token `amount` to a given `to` address.
should be called only from permissioned actor
bypasses the timelock entirely

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | addres to mint tokens to |
| amount | uint256 | amount to mint |

### mintGoverned

```solidity
function mintGoverned(address to, uint256 amount) external
```

mints mToken token `amount` to a given `to` address,
requires the timelock to pass
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | address to mint tokens to |
| amount | uint256 | amount to mint |

### burn

```solidity
function burn(address from, uint256 amount) external
```

burns mToken token `amount` from a given `from` address.
should be called only from permissioned actor
bypasses the timelock entirely

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | addres to burn tokens from |
| amount | uint256 | amount to burn |

### burnGoverned

```solidity
function burnGoverned(address from, uint256 amount) external
```

burns mToken token `amount` from a given `from` address,
bypassing blacklist checks.
requires the timelock to pass
should be called only from permissioned actor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | address to burn tokens from |
| amount | uint256 | amount to burn |

### clawback

```solidity
function clawback(uint256 amount, address from) external
```

claws back tokens from a given address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | amount to clawback |
| from | address | address to clawback tokens from |

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

### increaseMintRateLimit

```solidity
function increaseMintRateLimit(uint256 window, uint256 newLimit) external
```

increases mint rate limit for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| newLimit | uint256 | limit amount per window |

### decreaseMintRateLimit

```solidity
function decreaseMintRateLimit(uint256 window, uint256 newLimit) external
```

decreases mint rate limit for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |
| newLimit | uint256 | limit amount per window |

### removeMintRateLimitConfig

```solidity
function removeMintRateLimitConfig(uint256 window) external
```

removes mint rate limit config for a given window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| window | uint256 | window duration in seconds |

### getMintRateLimitStatuses

```solidity
function getMintRateLimitStatuses() external view returns (struct RateLimitLibrary.WindowRateLimitStatus[])
```

returns array of mint rate limit configs

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct RateLimitLibrary.WindowRateLimitStatus[] | statuses array of mint rate limit statuses |

### minterRole

```solidity
function minterRole() public view returns (bytes32)
```

AC role, owner of which can mint mToken token

### burnerRole

```solidity
function burnerRole() public view returns (bytes32)
```

AC role, owner of which can burn mToken token

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

### greenlistedRole

```solidity
function greenlistedRole() public view returns (bytes32)
```

sets the role that grants greenlisted rights to the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### minBalanceExemptRole

```solidity
function minBalanceExemptRole() public view returns (bytes32)
```

role that grants min balance exempt rights to the contract

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

### name

```solidity
function name() public view returns (string)
```

_Returns the name of the token._

### symbol

```solidity
function symbol() public view returns (string)
```

_Returns the symbol of the token, usually a shorter version of the
name._

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal
```

_overrides _beforeTokenTransfer function to ban
blaclisted users from using the token functions_

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

_overrides _afterTokenTransfer function to run custom validations_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | address of the sender |
| to | address | address of the recipient |
| amount | uint256 | amount of tokens transferred |

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

## BlacklistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### onlyNotBlacklistedTester

```solidity
function onlyNotBlacklistedTester(address account) external
```

### contractAdminRole

```solidity
function contractAdminRole() public pure returns (bytes32)
```

_main admin role for the contract_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## CustomAggregatorV3CompatibleFeedTester

### constructor

```solidity
constructor() public
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

### getDeviation

```solidity
function getDeviation(int256 _lastPrice, int256 _newPrice) public pure returns (uint256)
```

## DepositVaultTestBase

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### convertTokenToUsdTest

```solidity
function convertTokenToUsdTest(address tokenIn, uint256 amount) external view returns (uint256 amountInUsd, uint256 rate)
```

### convertUsdToMTokenTest

```solidity
function convertUsdToMTokenTest(uint256 amountUsd) external view returns (uint256 amountMToken, uint256 mTokenRate)
```

### calcAndValidateDeposit

```solidity
function calcAndValidateDeposit(address user, address tokenIn, uint256 amountToken, bool isInstant) external returns (struct DepositVault.CalcAndValidateDepositResult)
```

### calculateHoldbackPartRateFromAvgTest

```solidity
function calculateHoldbackPartRateFromAvgTest(uint256 depositedUsdAmount, uint256 depositedInstantUsdAmount, uint256 mTokenRate, uint256 avgMTokenRate) external pure returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view virtual returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view virtual returns (bytes32)
```

## DepositVaultTest

### constructor

```solidity
constructor() public
```

## DepositVaultWithAaveTest

### constructor

```solidity
constructor() public
```

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## DepositVaultWithMTokenTest

### constructor

```solidity
constructor() public
```

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## DepositVaultWithMorphoTest

### constructor

```solidity
constructor() public
```

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## DepositVaultWithUSTBTest

### constructor

```solidity
constructor() public
```

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

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## GreenlistableTester

### initialize

```solidity
function initialize(address _accessControl) external
```

### onlyGreenlistedTester

```solidity
function onlyGreenlistedTester(address account) external
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

### greenlistAdminRole

```solidity
function greenlistAdminRole() public view virtual returns (bytes32)
```

### contractAdminRole

```solidity
function contractAdminRole() public pure returns (bytes32)
```

_main admin role for the contract_

### greenlistedRole

```solidity
function greenlistedRole() public view virtual returns (bytes32)
```

AC role of a greenlist

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | role bytes32 role |

## ManageableVaultTesterBase

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### setVaultRole

```solidity
function setVaultRole(bytes32 role) external
```

### setOverrideGetTokenRate

```solidity
function setOverrideGetTokenRate(bool _override) external
```

### tokenTransferFromToTester

```solidity
function tokenTransferFromToTester(address token, address from, address to, uint256 amount, uint256 tokenDecimals) external
```

### setGetTokenRateValue

```solidity
function setGetTokenRateValue(uint256 val) external
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

### initializeExternal

```solidity
function initializeExternal(struct CommonVaultInitParams _commonVaultInitParams) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(struct CommonVaultInitParams _commonVaultInitParams) external
```

### contractAdminRole

```solidity
function contractAdminRole() public view virtual returns (bytes32)
```

_main admin role for the contract_

## ManageableVaultTester

### constructor

```solidity
constructor() public
```

constructor

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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

### setDefaultDelayTest

```solidity
function setDefaultDelayTest(uint32 delay) external
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

## MidasPauseManagerTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## MidasTimelockManagerTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## PausableTester

### setContractAdminRole

```solidity
function setContractAdminRole(bytes32 role) external
```

### initialize

```solidity
function initialize(address _accessControl) external
```

### requireFnNotPaused

```solidity
function requireFnNotPaused(bytes4 fn) external
```

### requireNotPaused

```solidity
function requireNotPaused(bytes4 fn) external
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## RedemptionVaultTestBase

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
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
function convertUsdToTokenTest(uint256 amountUsd, address tokenOut, uint256 overrideTokenOutRate) external view returns (uint256 amountToken, uint256 tokenRate)
```

### convertMTokenToUsdTest

```solidity
function convertMTokenToUsdTest(uint256 amountMToken, uint256 overrideMTokenRate) external view returns (uint256 amountUsd, uint256 mTokenRate)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view virtual returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view virtual returns (bytes32)
```

## RedemptionVaultTest

### constructor

```solidity
constructor() public
```

## RedemptionVaultWithAaveTest

### constructor

```solidity
constructor() public
```

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemAave

```solidity
function checkAndRedeemAave(address token, uint256 amount) external returns (uint256)
```

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## RedemptionVaultWithMTokenTest

### constructor

```solidity
constructor() public
```

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemMToken

```solidity
function checkAndRedeemMToken(address token, uint256 amount, uint256 rate) external returns (uint256)
```

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address token, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## RedemptionVaultWithMorphoTest

### constructor

```solidity
constructor() public
```

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemMorpho

```solidity
function checkAndRedeemMorpho(address token, uint256 amount) external returns (uint256)
```

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address token, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## RedemptionVaultWithUSTBTest

### constructor

```solidity
constructor() public
```

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

### checkAndRedeemUSTB

```solidity
function checkAndRedeemUSTB(address token, uint256 amount) external returns (uint256)
```

### _obtainVaultLiquidity

```solidity
function _obtainVaultLiquidity(address tokenOut, uint256 amountTokenOutBase18, uint256 tokenOutRate, uint256 currentTokenOutBalanceBase18, uint256 tokenOutDecimals) internal returns (uint256)
```

### _getTokenRate

```solidity
function _getTokenRate(address dataFeed, bool stable) internal view returns (uint256)
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

## WithMidasAccessControlTester

### WrongRolePreflightSucceeded

```solidity
error WrongRolePreflightSucceeded(bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperator, bool validateFunctionRole)
```

copy of `RolePreflightSucceeded` with a different name for testing

### setContractAdminRole

```solidity
function setContractAdminRole(bytes32 role) external
```

### initialize

```solidity
function initialize(address _accessControl) external
```

### initializeWithoutInitializer

```solidity
function initializeWithoutInitializer(address _accessControl) external
```

### withOnlyRole

```solidity
function withOnlyRole(bytes32 role, bool validateFunctionRole) external
```

### withOnlyRoleNoTimelock

```solidity
function withOnlyRoleNoTimelock(bytes32 role, bool validateFunctionRole) external
```

### withOnlyContractAdmin

```solidity
function withOnlyContractAdmin() external
```

### withUnprotected

```solidity
function withUnprotected() external
```

### withWrongRolePreflight

```solidity
function withWrongRolePreflight(bytes32 role, uint32 overrideDelay, bool roleIsFunctionOperator, bool validateFunctionRole) external pure
```

### contractAdminRole

```solidity
function contractAdminRole() public view returns (bytes32)
```

_main admin role for the contract_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## WithSanctionsListTester

### initialize

```solidity
function initialize(address _accessControl, address _sanctionsList) external
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

### contractAdminRole

```solidity
function contractAdminRole() public pure returns (bytes32)
```

_main admin role for the contract_

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## mTokenTest

### constructor

```solidity
constructor(bytes32 _managerRole, bytes32 _mintOperatorRole, bytes32 _burnOperatorRole, bytes32 _greenlistedRole, bytes32 _minBalanceExemptRole) public
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

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## MidasAccessControlTimelockController

TimelockController for Midas Protocol that is controlled by MidasTimelockManager

### timelockManager

```solidity
address timelockManager
```

address of MidasTimelockManager contract

### initialize

```solidity
function initialize(address _timelockManager) external
```

upgradeable pattern contract`s initializer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _timelockManager | address | address of MidasTimelockManager contract |

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

## CustomAggregatorV3CompatibleFeedAdjusted

AggregatorV3 compatible proxy-feed that adjusts the price
of an underlying chainlink compatible feed by a given signed percentage.
Positive adjustmentPercentage raises the reported price.
Negative adjustmentPercentage lowers the reported price.

### underlyingFeed

```solidity
contract AggregatorV3Interface underlyingFeed
```

the underlying chainlink compatible feed

### adjustmentPercentage

```solidity
int256 adjustmentPercentage
```

the adjustment percentage (signed).
Expressed in 10 ** decimals() precision.
Example: 10 ** decimals() = 1%, -(10 ** decimals()) = -1%
Positive values raise the reported price.
Negative values lower the reported price.

### constructor

```solidity
constructor(address _underlyingFeed, int256 _adjustmentPercentage) public
```

constructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _underlyingFeed | address | the underlying chainlink compatible feed |
| _adjustmentPercentage | int256 | signed adjustment percentage in 10 ** decimals() precision |

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

### _calculateAdjustedAnswer

```solidity
function _calculateAdjustedAnswer(int256 _answer) internal view returns (int256)
```

_calculates the adjusted answer_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _answer | int256 | the answer to adjust |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | the adjusted answer |

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
function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)
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

## CustomAggregatorV3CompatibleFeedAdjustedTester

### constructor

```solidity
constructor(address _underlyingFeed, int256 _adjustmentPercentage) public
```

### getAdjustedAnswer

```solidity
function getAdjustedAnswer(int256 _answer) public view returns (int256)
```

## DecimalsCorrectionTester

### convertAmountFromBase18Public

```solidity
function convertAmountFromBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

### convertAmountToBase18Public

```solidity
function convertAmountToBase18Public(uint256 amount, uint256 decimals) public pure returns (uint256)
```

## MidasAccessControlTimelockControllerTest

### _disableInitializers

```solidity
function _disableInitializers() internal
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies.

Emits an {Initialized} event the first time it is successfully executed._

### _onlyProxyAdmin

```solidity
function _onlyProxyAdmin() internal view
```

function to check if the sender is the proxy admin

## MidasInitializableTester

### initializeCallsCount

```solidity
uint256 initializeCallsCount
```

### reinitCallsCount

```solidity
uint256 reinitCallsCount
```

### initialize

```solidity
function initialize() external
```

### initializeV2

```solidity
function initializeV2() public
```

## RateLimitLibraryTester

Exposes {RateLimitLibrary} internals for unit tests.

### setWindowLimitPublic

```solidity
function setWindowLimitPublic(uint256 window, uint256 limit) external returns (uint256 previousLimit)
```

### removeWindowLimitPublic

```solidity
function removeWindowLimitPublic(uint256 window) external
```

### consumeLimitPublic

```solidity
function consumeLimitPublic(uint256 amount) external
```

### getWindowStatusesPublic

```solidity
function getWindowStatusesPublic() external view returns (struct RateLimitLibrary.WindowRateLimitStatus[])
```

### getWindowConfigPublic

```solidity
function getWindowConfigPublic(uint256 window) external view returns (uint256 limit, uint256 amountInFlight, uint256 lastUpdated, uint256 windowDuration)
```

### windowCountPublic

```solidity
function windowCountPublic() external view returns (uint256)
```

### hasWindowPublic

```solidity
function hasWindowPublic(uint256 window) external view returns (bool)
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

## MidasCCTBurnMintTokenPool

BurnMintTokenPool implementation for Midas mTokens

### fallbackReceiver

```solidity
address fallbackReceiver
```

The receiver of the tokens if user mint fails

### FallbackReceiverSet

```solidity
event FallbackReceiverSet(address newFallbackReceiver)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFallbackReceiver | address | The new fallback receiver |

### FallbackHit

```solidity
event FallbackHit(address originalReceiver, address fallbackReceiver, uint256 amount, bytes error)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| originalReceiver | address | The original receiver of the tokens |
| fallbackReceiver | address | The fallback receiver of the tokens |
| amount | uint256 | The amount of tokens |
| error | bytes | The error that occurred |

### InvalidFallbackReceiver

```solidity
error InvalidFallbackReceiver(address newFallbackReceiver)
```

Error thrown when the fallback receiver is set to address zero

### NotSelf

```solidity
error NotSelf()
```

Error thrown when the function is called by an address other than the contract itself

### constructor

```solidity
constructor(contract IMToken token, address rmnProxy, address router, address initFallbackReceiver) public
```

### setFallbackReceiver

```solidity
function setFallbackReceiver(address newFallbackReceiver) external
```

Set the fallback receiver of the pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFallbackReceiver | address | The new fallback receiver |

### _lockOrBurn

```solidity
function _lockOrBurn(uint64, uint256 amount) internal virtual
```

### _releaseOrMint

```solidity
function _releaseOrMint(address receiver, uint256 amount, uint64) internal virtual
```

_Mints the tokens to the receiver, in case if
user mint fails it mints to the fallback receiver_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | The original receiver of the tokens |
| amount | uint256 | The amount of tokens |
|  | uint64 |  |

### releaseOrMintInternal

```solidity
function releaseOrMintInternal(address receiver, uint256 amount) external
```

Function that mints the tokens to the receiver and
can be wrapped with a try/catch to handle errors

_Only callable by the contract itself_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | The receiver of the tokens |
| amount | uint256 | The amount of tokens |

### _mint

```solidity
function _mint(address receiver, uint256 amount) internal
```

_Mint the tokens to the receiver_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | The receiver of the tokens |
| amount | uint256 | The amount of tokens |

### _setFallbackReceiver

```solidity
function _setFallbackReceiver(address newFallbackReceiver) internal
```

_Set the fallback receiver of the pool_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newFallbackReceiver | address | The new fallback receiver |

## CCIPRmnMock

### setCursed

```solidity
function setCursed(bool cursed) external
```

### isCursed

```solidity
function isCursed() external view returns (bool)
```

Iff there is an active global or legacy curse, this function returns true.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool true if there is an active global curse. |

### isCursed

```solidity
function isCursed(bytes16) external view returns (bool)
```

### getCursedSubjects

```solidity
function getCursedSubjects() external pure returns (bytes16[])
```

gets the current set of cursed subjects.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes16[] |  |

