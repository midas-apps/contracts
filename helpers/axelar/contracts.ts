export const axelarItsAbi = [
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'tokenId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'destinationChain',
        type: 'string',
      },
      {
        internalType: 'bytes',
        name: 'destinationAddress',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'metadata',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'gasValue',
        type: 'uint256',
      },
    ],
    name: 'interchainTransfer',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'gasService',
    outputs: [
      { internalType: 'contract IAxelarGasService', name: '', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  {
    inputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    name: 'interchainTokenAddress',
    outputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'interchainTokenDeployer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'interchainTokenFactory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'interchainTokenId',
    outputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        internalType: 'enum ITokenManagerType.TokenManagerType',
        name: 'tokenManagerType',
        type: 'uint8',
      },
      { internalType: 'bytes', name: 'linkParams', type: 'bytes' },
    ],
    name: 'registerCustomToken',
    outputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      { internalType: 'uint256', name: 'gasValue', type: 'uint256' },
    ],
    name: 'registerTokenMetadata',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    name: 'registeredTokenAddress',
    outputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenManagerDeployer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'tokenId',
        type: 'bytes32',
      },
    ],
    name: 'tokenManagerAddress',
    outputs: [
      {
        internalType: 'address',
        name: 'tokenManagerAddress_',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export const axelarItsFactoryAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'deployer',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32',
      },
    ],
    name: 'linkedTokenDeploySalt',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'deploySalt',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  {
    inputs: [
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      { internalType: 'string', name: 'destinationChain', type: 'string' },
      { internalType: 'bytes', name: 'destinationTokenAddress', type: 'bytes' },
      {
        internalType: 'enum ITokenManagerType.TokenManagerType',
        name: 'tokenManagerType',
        type: 'uint8',
      },
      { internalType: 'bytes', name: 'linkParams', type: 'bytes' },
      { internalType: 'uint256', name: 'gasValue', type: 'uint256' },
    ],
    name: 'linkToken',
    outputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        internalType: 'enum ITokenManagerType.TokenManagerType',
        name: 'tokenManagerType',
        type: 'uint8',
      },
      { internalType: 'address', name: 'operator', type: 'address' },
    ],
    name: 'registerCustomToken',
    outputs: [{ internalType: 'bytes32', name: 'tokenId', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

export const axelarTokenManagerAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'interchainTokenService_',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'address', name: 'flowLimiter', type: 'address' }],
    name: 'AlreadyFlowLimiter',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'flowAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'flowToAdd', type: 'uint256' },
      { internalType: 'address', name: 'tokenManager', type: 'address' },
    ],
    name: 'FlowAdditionOverflow',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
      { internalType: 'uint256', name: 'flowAmount', type: 'uint256' },
      { internalType: 'address', name: 'tokenManager', type: 'address' },
    ],
    name: 'FlowLimitExceeded',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'flowLimit', type: 'uint256' },
      { internalType: 'uint256', name: 'flowToCompare', type: 'uint256' },
      { internalType: 'address', name: 'tokenManager', type: 'address' },
    ],
    name: 'FlowLimitOverflow',
    type: 'error',
  },
  { inputs: [], name: 'GiveTokenFailed', type: 'error' },
  {
    inputs: [{ internalType: 'bytes', name: 'bytesAddress', type: 'bytes' }],
    name: 'InvalidBytesLength',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'fromAccount', type: 'address' },
      { internalType: 'address', name: 'toAccount', type: 'address' },
      { internalType: 'uint256', name: 'accountRoles', type: 'uint256' },
    ],
    name: 'InvalidProposedRoles',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'accountRoles', type: 'uint256' },
    ],
    name: 'MissingAllRoles',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'accountRoles', type: 'uint256' },
    ],
    name: 'MissingAnyOfRoles',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint8', name: 'role', type: 'uint8' },
    ],
    name: 'MissingRole',
    type: 'error',
  },
  { inputs: [], name: 'MulticallFailed', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'flowLimiter', type: 'address' }],
    name: 'NotFlowLimiter',
    type: 'error',
  },
  { inputs: [], name: 'NotProxy', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'caller', type: 'address' }],
    name: 'NotService',
    type: 'error',
  },
  { inputs: [], name: 'NotSupported', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'caller', type: 'address' }],
    name: 'NotToken',
    type: 'error',
  },
  { inputs: [], name: 'TakeTokenFailed', type: 'error' },
  { inputs: [], name: 'TokenLinkerZeroAddress', type: 'error' },
  { inputs: [], name: 'TokenTransferFailed', type: 'error' },
  { inputs: [], name: 'ZeroAddress', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'tokenId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'flowLimit_',
        type: 'uint256',
      },
    ],
    name: 'FlowLimitSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'accountRoles',
        type: 'uint256',
      },
    ],
    name: 'RolesAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'fromAccount',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'toAccount',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'accountRoles',
        type: 'uint256',
      },
    ],
    name: 'RolesProposed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'accountRoles',
        type: 'uint256',
      },
    ],
    name: 'RolesRemoved',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'fromOperator', type: 'address' },
    ],
    name: 'acceptOperatorship',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'addFlowIn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'flowLimiter', type: 'address' }],
    name: 'addFlowLimiter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'addFlowOut',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approveService',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress_', type: 'address' },
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'burnToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'contractId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'flowInAmount',
    outputs: [
      { internalType: 'uint256', name: 'flowInAmount_', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'flowLimit',
    outputs: [{ internalType: 'uint256', name: 'flowLimit_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'flowOutAmount',
    outputs: [
      { internalType: 'uint256', name: 'flowOutAmount_', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes', name: 'params_', type: 'bytes' }],
    name: 'getTokenAddressFromParams',
    outputs: [
      { internalType: 'address', name: 'tokenAddress_', type: 'address' },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint8', name: 'role', type: 'uint8' },
    ],
    name: 'hasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementationType',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'interchainTokenId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'interchainTokenService',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'isFlowLimiter',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'isOperator',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress_', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'mintToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes', name: 'operator_', type: 'bytes' },
      { internalType: 'address', name: 'tokenAddress_', type: 'address' },
    ],
    name: 'params',
    outputs: [{ internalType: 'bytes', name: 'params_', type: 'bytes' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'operator', type: 'address' }],
    name: 'proposeOperatorship',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'flowLimiter', type: 'address' }],
    name: 'removeFlowLimiter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'flowLimit_', type: 'uint256' }],
    name: 'setFlowLimit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes', name: 'params_', type: 'bytes' }],
    name: 'setup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
    ],
    name: 'transferFlowLimiter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'operator', type: 'address' }],
    name: 'transferOperatorship',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const axelarItsAddress = '0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C';
export const axelarItsFactoryAddress =
  '0x83a93500d23Fbc3e82B410aD07A6a9F7A0670D66';
