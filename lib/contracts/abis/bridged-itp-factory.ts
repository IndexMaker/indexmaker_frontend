/**
 * BridgedItpFactory Contract ABI
 *
 * Factory for creating and managing bridged ITP tokens on Arbitrum.
 * Extracted from: bridge/bridge-contracts/out/BridgedItpFactory.sol/BridgedItpFactory.json
 */

export const bridgedItpFactoryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_bridge', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'bridgedItpCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'burnBridgedItp',
    inputs: [
      { name: 'orbitItp', type: 'address', internalType: 'address' },
      { name: 'from', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createBridgedItp',
    inputs: [
      { name: 'orbitItp', type: 'address', internalType: 'address' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'symbol', type: 'string', internalType: 'string' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAllBridgedItps',
    inputs: [],
    outputs: [{ name: '', type: 'address[]', internalType: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBridgedItp',
    inputs: [{ name: 'orbitItp', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isValidBridgedItp',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'mintBridgedItp',
    inputs: [
      { name: 'orbitItp', type: 'address', internalType: 'address' },
      { name: 'to', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'orbitToArbitrum',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'BridgedItpCreated',
    inputs: [
      {
        name: 'orbitItp',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'arbitrumToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      {
        name: 'symbol',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AlreadyExists',
    inputs: [{ name: 'orbitItp', type: 'address', internalType: 'address' }],
  },
  { type: 'error', name: 'InvalidOrbitItpAddress', inputs: [] },
  { type: 'error', name: 'InvalidTokenName', inputs: [] },
  { type: 'error', name: 'InvalidTokenSymbol', inputs: [] },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'TokenNotFound',
    inputs: [{ name: 'orbitItp', type: 'address', internalType: 'address' }],
  },
] as const;
