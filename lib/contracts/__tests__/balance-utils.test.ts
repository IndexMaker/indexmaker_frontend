/**
 * Tests for balance-utils.ts
 *
 * Tests balance checking and approval utilities for Arbitrum operations.
 *
 * Run tests: npm run test
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  checkUsdcBalance,
  checkItpBalance,
  hasApproval,
  hasSufficientUsdcBalance,
  hasSufficientItpBalance,
  USDC_DECIMALS,
  ITP_DECIMALS,
} from '../balance-utils';
import type { PublicClient } from 'viem';

// Mock public client factory
const createMockPublicClient = (readContractFn: jest.Mock) =>
  ({
    readContract: readContractFn,
    chain: { id: 42161, name: 'Arbitrum One' },
    transport: {},
  } as unknown as PublicClient);

describe('balance-utils', () => {
  let mockReadContract: jest.Mock;
  let mockPublicClient: PublicClient;

  beforeEach(() => {
    mockReadContract = jest.fn();
    mockPublicClient = createMockPublicClient(mockReadContract);
  });

  describe('checkUsdcBalance', () => {
    it('should return USDC balance for a valid address', async () => {
      const mockBalanceRaw = 1000000n; // 1 USDC (6 decimals)
      mockReadContract.mockResolvedValueOnce(mockBalanceRaw);

      const result = await checkUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890'
      );

      expect(result.raw).toBe(mockBalanceRaw);
      expect(result.formatted).toBe('1');
      expect(result.decimals).toBe(USDC_DECIMALS);
    });

    it('should handle zero balance', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await checkUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890'
      );

      expect(result.raw).toBe(0n);
      expect(result.formatted).toBe('0');
    });

    it('should handle large balances', async () => {
      const mockBalanceRaw = 1000000000000n; // 1,000,000 USDC
      mockReadContract.mockResolvedValueOnce(mockBalanceRaw);

      const result = await checkUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890'
      );

      expect(result.raw).toBe(mockBalanceRaw);
      expect(result.formatted).toBe('1000000');
    });

    it('should throw on contract read failure', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Contract call failed'));

      await expect(
        checkUsdcBalance(mockPublicClient, '0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Failed to check USDC balance');
    });
  });

  describe('checkItpBalance', () => {
    it('should return ITP balance for valid addresses', async () => {
      const mockBalanceRaw = 1000000000000000000n; // 1 ITP (18 decimals)
      mockReadContract.mockResolvedValueOnce(mockBalanceRaw);

      const result = await checkItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );

      expect(result.raw).toBe(mockBalanceRaw);
      expect(result.formatted).toBe('1');
      expect(result.decimals).toBe(ITP_DECIMALS);
    });

    it('should handle zero ITP balance', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await checkItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      );

      expect(result.raw).toBe(0n);
      expect(result.formatted).toBe('0');
    });

    it('should throw on contract read failure', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Contract call failed'));

      await expect(
        checkItpBalance(
          mockPublicClient,
          '0x1234567890123456789012345678901234567890',
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        )
      ).rejects.toThrow('Failed to check ITP balance');
    });
  });

  describe('hasApproval', () => {
    it('should return true when allowance >= amount', async () => {
      const mockAllowance = 2000000n; // 2 USDC
      mockReadContract.mockResolvedValueOnce(mockAllowance);

      const result = await hasApproval(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000001',
        1000000n // 1 USDC
      );

      expect(result.hasApproval).toBe(true);
      expect(result.currentAllowance).toBe(mockAllowance);
    });

    it('should return false when allowance < amount', async () => {
      const mockAllowance = 500000n; // 0.5 USDC
      mockReadContract.mockResolvedValueOnce(mockAllowance);

      const result = await hasApproval(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000001',
        1000000n // 1 USDC
      );

      expect(result.hasApproval).toBe(false);
      expect(result.currentAllowance).toBe(mockAllowance);
    });

    it('should return true when allowance equals amount exactly', async () => {
      const mockAllowance = 1000000n; // 1 USDC
      mockReadContract.mockResolvedValueOnce(mockAllowance);

      const result = await hasApproval(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000001',
        1000000n // 1 USDC
      );

      expect(result.hasApproval).toBe(true);
      expect(result.currentAllowance).toBe(mockAllowance);
    });

    it('should throw on allowance check failure', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Allowance call failed'));

      await expect(
        hasApproval(
          mockPublicClient,
          '0x1234567890123456789012345678901234567890',
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          '0x0000000000000000000000000000000000000001',
          1000000n
        )
      ).rejects.toThrow('Failed to check approval');
    });
  });

  describe('hasSufficientUsdcBalance', () => {
    it('should return isSufficient=true when balance >= required', async () => {
      const mockBalance = 2000000n; // 2 USDC
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        1000000n // 1 USDC required
      );

      expect(result.isSufficient).toBe(true);
      expect(result.balance.raw).toBe(mockBalance);
      expect(result.shortfall).toBe(0n);
    });

    it('should return isSufficient=false when balance < required', async () => {
      const mockBalance = 500000n; // 0.5 USDC
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        1000000n // 1 USDC required
      );

      expect(result.isSufficient).toBe(false);
      expect(result.balance.raw).toBe(mockBalance);
      expect(result.shortfall).toBe(500000n); // 0.5 USDC shortfall
    });

    it('should return isSufficient=true when balance equals required exactly', async () => {
      const mockBalance = 1000000n; // 1 USDC
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        1000000n // 1 USDC required
      );

      expect(result.isSufficient).toBe(true);
      expect(result.shortfall).toBe(0n);
    });

    it('should handle zero balance correctly', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await hasSufficientUsdcBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        1000000n // 1 USDC required
      );

      expect(result.isSufficient).toBe(false);
      expect(result.balance.raw).toBe(0n);
      expect(result.shortfall).toBe(1000000n);
    });
  });

  describe('hasSufficientItpBalance', () => {
    const itpAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    it('should return isSufficient=true when balance >= required', async () => {
      const mockBalance = 2000000000000000000n; // 2 ITP
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        itpAddress,
        1000000000000000000n // 1 ITP required
      );

      expect(result.isSufficient).toBe(true);
      expect(result.balance.raw).toBe(mockBalance);
      expect(result.shortfall).toBe(0n);
    });

    it('should return isSufficient=false when balance < required', async () => {
      const mockBalance = 500000000000000000n; // 0.5 ITP
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        itpAddress,
        1000000000000000000n // 1 ITP required
      );

      expect(result.isSufficient).toBe(false);
      expect(result.balance.raw).toBe(mockBalance);
      expect(result.shortfall).toBe(500000000000000000n); // 0.5 ITP shortfall
    });

    it('should return isSufficient=true when balance equals required exactly', async () => {
      const mockBalance = 1000000000000000000n; // 1 ITP
      mockReadContract.mockResolvedValueOnce(mockBalance);

      const result = await hasSufficientItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        itpAddress,
        1000000000000000000n // 1 ITP required
      );

      expect(result.isSufficient).toBe(true);
      expect(result.shortfall).toBe(0n);
    });

    it('should handle zero balance correctly', async () => {
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await hasSufficientItpBalance(
        mockPublicClient,
        '0x1234567890123456789012345678901234567890',
        itpAddress,
        1000000000000000000n // 1 ITP required
      );

      expect(result.isSufficient).toBe(false);
      expect(result.balance.raw).toBe(0n);
      expect(result.shortfall).toBe(1000000000000000000n);
    });
  });
});
