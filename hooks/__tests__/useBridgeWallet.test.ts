/**
 * Unit tests for useBridgeWallet hook utility functions
 *
 * Tests the exported utility functions (getActiveWalletProvider, getActiveWalletAccount, getActiveWalletChainId).
 *
 * SETUP REQUIRED: These tests require Jest and @testing-library/react. To run:
 *   1. npm install --save-dev jest @types/jest ts-jest @testing-library/react
 *   2. Create jest.config.js with ts-jest preset
 *   3. npm run test (add "test": "jest" to package.json scripts)
 *
 * NOTE: The useBridgeWallet React hook itself requires @testing-library/react-hooks
 * or React 18's renderHook to test properly. The tests below focus on the
 * non-hook utility functions that can be tested without React rendering.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock web3-onboard module before importing the hook
jest.mock('@/lib/blocknative/web3-onboard', () => ({
  default: {
    state: {
      get: jest.fn(),
      select: jest.fn(() => ({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      })),
    },
  },
}));

// Mock contract factory modules
jest.mock('@/lib/contracts/bridge-proxy', () => ({
  getBridgeProxyRead: jest.fn(() => ({ type: 'bridgeProxy-read' })),
  getBridgeProxyWrite: jest.fn(() => ({ type: 'bridgeProxy-write' })),
  BRIDGE_PROXY_ADDRESS: '0xABCFB96dfB5e872921D20ba392E324bE0525D139',
}));

jest.mock('@/lib/contracts/bridged-itp-factory', () => ({
  getBridgedItpFactoryRead: jest.fn(() => ({ type: 'bridgedItpFactory-read' })),
  getBridgedItpFactoryWrite: jest.fn(() => ({ type: 'bridgedItpFactory-write' })),
  BRIDGED_ITP_FACTORY_ADDRESS: '0xdd236e1584c0e35DAd4e0dacF27c9831FdeD52ba',
}));

jest.mock('@/lib/contracts/usdc', () => ({
  getUsdcRead: jest.fn(() => ({ type: 'usdc-read' })),
  getUsdcWrite: jest.fn(() => ({ type: 'usdc-write' })),
  USDC_ADDRESS: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
}));

jest.mock('@/lib/contracts/addresses', () => ({
  ARBITRUM_CHAIN_ID: 42161,
}));

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({ type: 'publicClient' })),
  createWalletClient: jest.fn(() => ({ type: 'walletClient' })),
  custom: jest.fn((provider) => ({ type: 'custom', provider })),
  http: jest.fn(() => ({ type: 'http' })),
}));

jest.mock('viem/chains', () => ({
  arbitrum: { id: 42161, name: 'Arbitrum One' },
}));

describe('useBridgeWallet Utility Functions', () => {
  let mockOnboard: { state: { get: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockOnboard = jest.requireMock('@/lib/blocknative/web3-onboard').default;
  });

  describe('getActiveWalletProvider', () => {
    it('should return null when no wallets connected', async () => {
      mockOnboard.state.get.mockReturnValue({ wallets: [] });

      const { getActiveWalletProvider } = await import('../useBridgeWallet');
      const provider = getActiveWalletProvider();

      expect(provider).toBeNull();
    });

    it('should return provider when wallet is connected', async () => {
      const mockProvider = { request: jest.fn() };
      mockOnboard.state.get.mockReturnValue({
        wallets: [
          {
            label: 'MetaMask',
            accounts: [{ address: '0x1234567890123456789012345678901234567890' }],
            provider: mockProvider,
          },
        ],
      });

      const { getActiveWalletProvider } = await import('../useBridgeWallet');
      const provider = getActiveWalletProvider();

      expect(provider).toBe(mockProvider);
    });
  });

  describe('getActiveWalletAccount', () => {
    it('should return null when no wallets connected', async () => {
      mockOnboard.state.get.mockReturnValue({ wallets: [] });

      const { getActiveWalletAccount } = await import('../useBridgeWallet');
      const account = getActiveWalletAccount();

      expect(account).toBeNull();
    });

    it('should return address when wallet is connected', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      mockOnboard.state.get.mockReturnValue({
        wallets: [
          {
            label: 'MetaMask',
            accounts: [{ address: testAddress }],
            provider: {},
          },
        ],
      });

      const { getActiveWalletAccount } = await import('../useBridgeWallet');
      const account = getActiveWalletAccount();

      expect(account).toBe(testAddress);
    });
  });

  describe('getActiveWalletChainId', () => {
    it('should return null when no wallets connected', async () => {
      mockOnboard.state.get.mockReturnValue({ wallets: [] });

      const { getActiveWalletChainId } = await import('../useBridgeWallet');
      const chainId = getActiveWalletChainId();

      expect(chainId).toBeNull();
    });

    it('should return chain ID as number when wallet is connected', async () => {
      mockOnboard.state.get.mockReturnValue({
        wallets: [
          {
            label: 'MetaMask',
            accounts: [{ address: '0x1234567890123456789012345678901234567890' }],
            provider: {},
            chains: [{ id: '0xa4b1' }], // 42161 in hex
          },
        ],
      });

      const { getActiveWalletChainId } = await import('../useBridgeWallet');
      const chainId = getActiveWalletChainId();

      expect(chainId).toBe(42161);
    });

    it('should return null when chain info is missing', async () => {
      mockOnboard.state.get.mockReturnValue({
        wallets: [
          {
            label: 'MetaMask',
            accounts: [{ address: '0x1234567890123456789012345678901234567890' }],
            provider: {},
            chains: [],
          },
        ],
      });

      const { getActiveWalletChainId } = await import('../useBridgeWallet');
      const chainId = getActiveWalletChainId();

      expect(chainId).toBeNull();
    });
  });
});

describe('Error Handling', () => {
  let mockOnboard: { state: { get: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockOnboard = jest.requireMock('@/lib/blocknative/web3-onboard').default;
  });

  it('should handle missing accounts array gracefully', async () => {
    mockOnboard.state.get.mockReturnValue({
      wallets: [
        {
          label: 'MetaMask',
          accounts: [],
          provider: {},
        },
      ],
    });

    const { getActiveWalletAccount } = await import('../useBridgeWallet');
    const account = getActiveWalletAccount();

    expect(account).toBeNull();
  });

  it('should handle undefined wallets gracefully', async () => {
    mockOnboard.state.get.mockReturnValue({ wallets: undefined });

    const { getActiveWalletProvider, getActiveWalletAccount, getActiveWalletChainId } = await import('../useBridgeWallet');

    expect(getActiveWalletProvider()).toBeNull();
    expect(getActiveWalletAccount()).toBeNull();
    expect(getActiveWalletChainId()).toBeNull();
  });
});

describe('Re-exported Constants', () => {
  it('should re-export ARBITRUM_CHAIN_ID', async () => {
    const { ARBITRUM_CHAIN_ID } = await import('../useBridgeWallet');
    expect(ARBITRUM_CHAIN_ID).toBe(42161);
  });

  it('should re-export contract addresses', async () => {
    const {
      BRIDGE_PROXY_ADDRESS,
      BRIDGED_ITP_FACTORY_ADDRESS,
      USDC_ADDRESS,
    } = await import('../useBridgeWallet');

    expect(BRIDGE_PROXY_ADDRESS).toBe('0xABCFB96dfB5e872921D20ba392E324bE0525D139');
    expect(BRIDGED_ITP_FACTORY_ADDRESS).toBe('0xdd236e1584c0e35DAd4e0dacF27c9831FdeD52ba');
    expect(USDC_ADDRESS).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
  });
});
