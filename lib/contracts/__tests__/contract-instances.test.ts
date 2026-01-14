/**
 * Unit tests for bridge contract utilities
 *
 * Tests contract instance creation with mocked viem clients.
 *
 * SETUP REQUIRED: These tests require Jest. To run:
 *   1. npm install --save-dev jest @types/jest ts-jest
 *   2. Create jest.config.js with ts-jest preset
 *   3. npm run test (add "test": "jest" to package.json scripts)
 *
 * Alternatively, these can be converted to Playwright component tests.
 */
import { describe, it, expect } from '@jest/globals';
import { getBridgeProxyRead, getBridgeProxyWrite } from '../bridge-proxy';
import { getBridgedItpFactoryRead, getBridgedItpFactoryWrite } from '../bridged-itp-factory';
import { getUsdcRead, getUsdcWrite } from '../usdc';
import {
  BRIDGE_PROXY_ADDRESS,
  BRIDGED_ITP_FACTORY_ADDRESS,
  USDC_ADDRESS,
  ARBITRUM_CHAIN_ID,
} from '../addresses';
import type { PublicClient, WalletClient } from 'viem';

// Mock public client
const mockPublicClient = {
  chain: { id: 42161, name: 'Arbitrum One' },
  transport: {},
} as unknown as PublicClient;

// Mock wallet client
const mockWalletClient = {
  account: { address: '0x1234567890123456789012345678901234567890' as `0x${string}` },
  chain: { id: 42161, name: 'Arbitrum One' },
  transport: {},
} as unknown as WalletClient;

describe('Contract Addresses', () => {
  it('should export ARBITRUM_CHAIN_ID as 42161', () => {
    expect(ARBITRUM_CHAIN_ID).toBe(42161);
  });

  it('should export valid BridgeProxy address', () => {
    expect(BRIDGE_PROXY_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(BRIDGE_PROXY_ADDRESS).toBe('0xABCFB96dfB5e872921D20ba392E324bE0525D139');
  });

  it('should export valid BridgedItpFactory address', () => {
    expect(BRIDGED_ITP_FACTORY_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(BRIDGED_ITP_FACTORY_ADDRESS).toBe('0xdd236e1584c0e35DAd4e0dacF27c9831FdeD52ba');
  });

  it('should export valid USDC address', () => {
    expect(USDC_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(USDC_ADDRESS).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
  });
});

describe('BridgeProxy Contract Instance', () => {
  it('should create read-only instance with public client', () => {
    const contract = getBridgeProxyRead(mockPublicClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(BRIDGE_PROXY_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should create read-write instance with public and wallet clients', () => {
    const contract = getBridgeProxyWrite(mockPublicClient, mockWalletClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(BRIDGE_PROXY_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should include expected functions in ABI', () => {
    const contract = getBridgeProxyRead(mockPublicClient);
    const functionNames = contract.abi
      .filter((item) => item.type === 'function')
      .map((item) => (item as { name: string }).name);

    expect(functionNames).toContain('depositForBuy');
    expect(functionNames).toContain('requestSell');
    expect(functionNames).toContain('getUserDepositNonce');
    expect(functionNames).toContain('factory');
    expect(functionNames).toContain('usdc');
  });
});

describe('BridgedItpFactory Contract Instance', () => {
  it('should create read-only instance with public client', () => {
    const contract = getBridgedItpFactoryRead(mockPublicClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(BRIDGED_ITP_FACTORY_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should create read-write instance with public and wallet clients', () => {
    const contract = getBridgedItpFactoryWrite(mockPublicClient, mockWalletClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(BRIDGED_ITP_FACTORY_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should include expected functions in ABI', () => {
    const contract = getBridgedItpFactoryRead(mockPublicClient);
    const functionNames = contract.abi
      .filter((item) => item.type === 'function')
      .map((item) => (item as { name: string }).name);

    expect(functionNames).toContain('getAllBridgedItps');
    expect(functionNames).toContain('getBridgedItp');
    expect(functionNames).toContain('isValidBridgedItp');
    expect(functionNames).toContain('bridgedItpCount');
  });
});

describe('USDC Contract Instance', () => {
  it('should create read-only instance with public client', () => {
    const contract = getUsdcRead(mockPublicClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(USDC_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should create read-write instance with public and wallet clients', () => {
    const contract = getUsdcWrite(mockPublicClient, mockWalletClient);
    expect(contract).toBeDefined();
    expect(contract.address).toBe(USDC_ADDRESS);
    expect(contract.abi).toBeDefined();
  });

  it('should include standard ERC20 functions in ABI', () => {
    const contract = getUsdcRead(mockPublicClient);
    const functionNames = contract.abi
      .filter((item) => item.type === 'function')
      .map((item) => (item as { name: string }).name);

    expect(functionNames).toContain('approve');
    expect(functionNames).toContain('allowance');
    expect(functionNames).toContain('balanceOf');
    expect(functionNames).toContain('transfer');
    expect(functionNames).toContain('transferFrom');
  });
});
