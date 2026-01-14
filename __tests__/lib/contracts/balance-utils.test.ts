/**
 * Unit tests for dual-chain balance utilities
 */

import {
  checkOrbitItpBalance,
  checkArbitrumBridgedItpBalance,
  fetchDualChainBalances,
  createOrbitClient,
  createArbitrumClient,
  ITP_DECIMALS,
  type BalanceResult,
  type DualChainBalanceResult,
} from '@/lib/contracts/balance-utils';

// Mock viem
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
    http: jest.fn(() => 'mock-transport'),
  };
});

const mockReadContract = jest.fn();

describe('Dual-Chain Balance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock client
    const { createPublicClient } = require('viem');
    createPublicClient.mockReturnValue({
      readContract: mockReadContract,
    });
  });

  describe('createOrbitClient', () => {
    it('should create a public client for Orbit chain', () => {
      const client = createOrbitClient();
      expect(client).toBeDefined();
      expect(client.readContract).toBeDefined();
    });
  });

  describe('createArbitrumClient', () => {
    it('should create a public client for Arbitrum chain', () => {
      const client = createArbitrumClient();
      expect(client).toBeDefined();
      expect(client.readContract).toBeDefined();
    });
  });

  describe('checkOrbitItpBalance', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const testItpAddress = '0xabcdef0123456789abcdef0123456789abcdef01';

    it('should return balance for valid address', async () => {
      const mockBalance = 1000000000000000000n; // 1 ITP
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await checkOrbitItpBalance(testAddress, testItpAddress);

      expect(result).toEqual({
        raw: mockBalance,
        formatted: '1',
        decimals: ITP_DECIMALS,
      });
    });

    it('should handle zero balance', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await checkOrbitItpBalance(testAddress, testItpAddress);

      expect(result).toEqual({
        raw: 0n,
        formatted: '0',
        decimals: ITP_DECIMALS,
      });
    });

    it('should throw error on RPC failure', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        checkOrbitItpBalance(testAddress, testItpAddress)
      ).rejects.toThrow('Failed to check Orbit ITP balance: Network error');
    });
  });

  describe('checkArbitrumBridgedItpBalance', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const testItpAddress = '0xabcdef0123456789abcdef0123456789abcdef01';

    it('should return balance for valid address', async () => {
      const mockBalance = 2500000000000000000n; // 2.5 ITP
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const mockClient = { readContract: mockReadContract };
      const result = await checkArbitrumBridgedItpBalance(
        mockClient,
        testAddress,
        testItpAddress
      );

      expect(result).toEqual({
        raw: mockBalance,
        formatted: '2.5',
        decimals: ITP_DECIMALS,
      });
    });
  });

  describe('fetchDualChainBalances', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const arbitrumItpAddress = '0xaaa0000000000000000000000000000000000001';
    const orbitItpAddress = '0xbbb0000000000000000000000000000000000002';

    it('should fetch balances from both chains in parallel', async () => {
      const arbitrumBalance = 1000000000000000000n; // 1 ITP on Arbitrum
      const orbitBalance = 2000000000000000000n; // 2 ITP on Orbit

      // Mock both calls
      mockReadContract
        .mockResolvedValueOnce(arbitrumBalance) // Arbitrum call
        .mockResolvedValueOnce(orbitBalance); // Orbit call

      const result = await fetchDualChainBalances(
        testAddress,
        arbitrumItpAddress,
        orbitItpAddress
      );

      expect(result.arbitrum.raw).toBe(arbitrumBalance);
      expect(result.orbit.raw).toBe(orbitBalance);
      expect(result.total.raw).toBe(arbitrumBalance + orbitBalance);
      expect(result.total.formatted).toBe('3');
    });

    it('should handle one chain failing gracefully', async () => {
      const arbitrumBalance = 1000000000000000000n;

      // Arbitrum succeeds, Orbit fails
      mockReadContract
        .mockResolvedValueOnce(arbitrumBalance)
        .mockRejectedValueOnce(new Error('Orbit RPC down'));

      const result = await fetchDualChainBalances(
        testAddress,
        arbitrumItpAddress,
        orbitItpAddress
      );

      // Should return Arbitrum balance and zero for Orbit
      expect(result.arbitrum.raw).toBe(arbitrumBalance);
      expect(result.orbit.raw).toBe(0n);
      expect(result.total.raw).toBe(arbitrumBalance);
    });

    it('should handle both chains failing gracefully', async () => {
      mockReadContract
        .mockRejectedValueOnce(new Error('Arbitrum RPC down'))
        .mockRejectedValueOnce(new Error('Orbit RPC down'));

      const result = await fetchDualChainBalances(
        testAddress,
        arbitrumItpAddress,
        orbitItpAddress
      );

      // Should return zero for both
      expect(result.arbitrum.raw).toBe(0n);
      expect(result.orbit.raw).toBe(0n);
      expect(result.total.raw).toBe(0n);
    });

    it('should use provided Arbitrum client if given', async () => {
      const customMockReadContract = jest.fn();
      const customClient = { readContract: customMockReadContract };

      customMockReadContract.mockResolvedValue(500000000000000000n);
      mockReadContract.mockResolvedValue(500000000000000000n);

      await fetchDualChainBalances(
        testAddress,
        arbitrumItpAddress,
        orbitItpAddress,
        customClient
      );

      // Custom client should be used for Arbitrum
      expect(customMockReadContract).toHaveBeenCalled();
    });
  });
});
