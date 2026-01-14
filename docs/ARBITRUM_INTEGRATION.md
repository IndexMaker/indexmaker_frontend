# Arbitrum Integration Guide

## Overview

This document describes how to integrate the Arbitrum buy/sell contract functions into the existing frontend once they are deployed.

**Current Status**: BLOCKED - Contract functions `depositForBuy` and `requestSell` are not yet deployed.

## Contract Interface (Expected)

```solidity
// BridgeProxy.sol - Functions to be deployed
function depositForBuy(uint256 amount, address targetItp) external;
function requestSell(address itp, uint256 amount) external;
```

## Integration Hooks (Ready Now)

The following hooks are implemented and ready for integration:

### useArbitrumBuy
- Location: `hooks/useArbitrumBuy.ts`
- Purpose: Execute buy flow with USDC validation and approval
- Status: Interface ready, contract calls stubbed

### useArbitrumSell
- Location: `hooks/useArbitrumSell.ts`
- Purpose: Execute sell flow with ITP validation and approval
- Status: Interface ready, contract calls stubbed

### useBridgeWallet
- Location: `hooks/useBridgeWallet.ts`
- Purpose: Provides contract instances for Arbitrum operations
- Status: Fully functional

## Balance Utilities (Ready Now)

Location: `lib/contracts/balance-utils.ts`

Available functions:
- `checkUsdcBalance(publicClient, address)` - Get USDC balance on Arbitrum
- `checkItpBalance(publicClient, address, itpAddress)` - Get ITP balance
- `hasApproval(publicClient, owner, token, spender, amount)` - Check token approval
- `hasSufficientUsdcBalance(...)` - Check if user can afford purchase
- `hasSufficientItpBalance(...)` - Check if user has enough ITP to sell

## TransactionConfirmModal Integration Points

### Current Flow (OTC on Base)
```
File: components/elements/transaction-modal.tsx

1. Send Index Order via WebSocket (handleSendOrder)
2. Approve USDC for OTC Index contract (handleApproval)
3. Deposit to OTC Index contract (handleDeposit)
4. Show progress and mint invoice
```

### Proposed Arbitrum Flow
```
When contracts are deployed, modify:

1. Replace handleSendOrder with useArbitrumBuy.executeBuy()
   - No WebSocket order needed for Arbitrum flow
   - Direct contract interaction

2. handleApproval → Already in useArbitrumBuy
   - Approval is handled within the hook
   - Same UX pattern (check → approve → execute)

3. handleDeposit → Replaced by depositForBuy in hook
   - Hook handles the contract call
   - Returns tx hash for tracking
```

### Code Changes Checklist

When deploying contracts, make these changes:

#### Step 1: Enable Contract Functions in Hooks
```typescript
// In hooks/useArbitrumBuy.ts
// Uncomment the contract interaction blocks (marked with TODO)
```

#### Step 2: Add Chain Detection to TransactionConfirmModal
```typescript
// Detect if user should use Arbitrum or Base flow
const isArbitrumFlow = /* condition based on selected vault/token */;

if (isArbitrumFlow) {
  // Use useArbitrumBuy hook
  const result = await executeBuy({ amount, targetItpAddress });
} else {
  // Existing OTC flow
  await handleSendOrder();
}
```

#### Step 3: Update UI Status Indicators
```typescript
// Map hook status to UI states
const getStatusFromBuyHook = (status: BuyStatus) => {
  switch (status) {
    case 'checking_balance':
    case 'checking_approval':
      return 'idle';
    case 'approving':
      return 'processing';
    case 'depositing':
    case 'processing':
      return 'processing';
    case 'success':
      return 'done';
    case 'error':
    case 'insufficient_balance':
    case 'approval_failed':
    case 'deposit_failed':
      return 'error';
    default:
      return 'idle';
  }
};
```

## SupplyPanel Integration Points

### Current Flow
```
File: components/elements/supply-panel.tsx

1. User enters amount in Buy tab
2. Balance validated against current chain's USDC
3. Click "Finalize Transactions" opens TransactionConfirmModal
4. Modal handles the OTC buy flow
```

### Arbitrum Integration Changes
```
When contracts are deployed:

1. Add chain detection in handleSupply()
   - Check if selected vault is on Arbitrum
   - If so, ensure user is on Arbitrum chain

2. Balance validation already uses balances["USDC"]
   - Could optionally use checkUsdcBalance for explicit Arbitrum check

3. Sell button is currently disabled
   - Enable when Keeper mechanism is ready (Epic 5)
   - Wire to useArbitrumSell hook
```

## BridgeTab Status

**KEEP AS LEGACY** - Do not merge into main buy flow.

Location: `components/elements/bridge-tab.tsx`

Purpose:
- Testing USDC bridging between Arbitrum and Orbit
- Independent from buy/sell flows
- Direct viem calls to bridge contracts

Status: Maintained separately for testing purposes.

## File Checklist

### Created in This Story
- [x] `lib/contracts/balance-utils.ts` - Balance/approval utilities
- [x] `lib/contracts/__tests__/balance-utils.test.ts` - Tests
- [x] `hooks/useArbitrumBuy.ts` - Buy flow hook
- [x] `hooks/useArbitrumSell.ts` - Sell flow hook
- [x] `hooks/__tests__/useArbitrumBuy.test.ts` - Tests
- [x] `hooks/__tests__/useArbitrumSell.test.ts` - Tests
- [x] `docs/ARBITRUM_INTEGRATION.md` - This document

### Existing Files (Integration Ready)
- [x] `hooks/useBridgeWallet.ts` - Contract instances
- [x] `lib/contracts/bridge-proxy.ts` - BridgeProxy contract
- [x] `lib/contracts/addresses.ts` - Contract addresses
- [x] `lib/contracts/abis/*.ts` - Contract ABIs

### Files to Modify (When Contracts Deploy)
- [ ] `hooks/useArbitrumBuy.ts` - Uncomment contract calls
- [ ] `hooks/useArbitrumSell.ts` - Uncomment contract calls
- [ ] `components/elements/transaction-modal.tsx` - Add Arbitrum flow
- [ ] `components/elements/supply-panel.tsx` - Enable sell button

## Testing Strategy

### Unit Tests
- Balance utilities: `lib/contracts/__tests__/balance-utils.test.ts`
- Hook types: `hooks/__tests__/useArbitrumBuy.test.ts`, `useArbitrumSell.test.ts`
- Contract instances: `lib/contracts/__tests__/contract-instances.test.ts`

### Integration Tests (When Contracts Ready)
1. Buy flow E2E test
2. Sell flow E2E test
3. Approval flow test
4. Insufficient balance handling test

### Manual Testing
1. Connect wallet on Arbitrum
2. Check USDC balance displays correctly
3. Attempt buy with insufficient funds (should show error)
4. Complete buy with sufficient funds (when contracts ready)

## Deployment Day Checklist

1. [ ] Update contract addresses in `lib/contracts/addresses.ts`
2. [ ] Verify ABIs match deployed contracts
3. [ ] Uncomment contract calls in hooks
4. [ ] Test on mainnet with small amounts
5. [ ] Enable sell button in UI
6. [ ] Update this document with any changes
