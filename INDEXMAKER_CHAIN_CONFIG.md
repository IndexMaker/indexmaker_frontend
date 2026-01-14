# IndexMaker Chain Configuration

## Chain Details

| Property | Value |
|----------|-------|
| **Chain ID (Decimal)** | 111174029 |
| **Chain ID (Hex)** | 0x6A11E3D |
| **Chain Name** | IndexMaker Chain |
| **Network Type** | Arbitrum Orbit (L3) |
| **Native Token Symbol** | IND |
| **Native Token Name** | IndexMaker |
| **Native Token Decimals** | 18 |

## Network URLs

| Type | URL |
|------|-----|
| **RPC (HTTPS)** | https://index.rpc.zeeve.net |
| **RPC (WebSocket)** | wss://index.rpc.zeeve.net |
| **Block Explorer** | https://index.explorer.zeeve.net |
| **Bridge** | https://index.bridge.zeeve.net |
| **Documentation** | https://docs.zeeve.io/rollups/arbitrum-orbit |

## Premine Information

| Property | Value |
|----------|-------|
| **Premine Address** | 0xC0D3Cb0c97CbF87F103a9901100D8f6D3e94D42A |
| **Private Key** | 0x4b3b08e6572b6fc14645a57933b20102e280f25a7372850b2c2ddb63adcb0fee |

## Smart Contractsd

### Arbitrum Sepolia (L2) Smart Contracts

| Contract | Address |
|----------|---------|
| **customGateway** | 0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1 |
| **multicall** | 0xce1CAd780c529e66e3aa6D952a1ED9A6447791c1 |
| **proxyAdmin** | 0xfBD241A6aDb21bdC62a756Edfa9996a4d846c0a2 |
| **router** | 0x57dC5679a1D3a0FEd9ED262c76a690ac93AFDedA |
| **standardGateway** | 0x55512B35B74F3D376151d55a48245a1A15e1B2fb |
| **weth** | 0x0000000000000000000000000000000000000000 |
| **wethGateway** | 0x0000000000000000000000000000000000000000 |

### Nitro Node (L3) Smart Contracts

| Contract | Address |
|----------|---------|
| **customGateway** | 0xF32E0B5678f6DA2F5a3604d91084eA8d139CC0a0 |
| **multicall** | 0xBeCEc67c061Cc259e94ce0580ee9E8B3DD7b8cAB |
| **proxyAdmin** | 0xfBD241A6aDb21bdC62a756Edfa9996a4d846c0a2 |
| **router** | 0x5fA8588191ab1CBd54a8B7cF15067b7c72f245cC |
| **standardGateway** | 0x77179777bEB686AA251dD48a0EE4de3677F80350 |

## MetaMask Configuration

When adding the IndexMaker Chain to MetaMask, use the following values:

```
Network Name: IndexMaker Chain
New RPC URL: https://index.rpc.zeeve.net
Chain ID: 111222333
Currency Symbol: IND
Block Explorer URL: https://index.explorer.zeeve.net
```

## Files Updated

The following configuration files have been updated:

1. **`indexmaker_frontend/lib/blocknative/web3-onboard.ts`**
   - Updated token symbol from "ETH" to "IND"
   - Added block explorer URL

2. **`indexmaker_frontend/lib/blocknative/viem.ts`**
   - Updated native currency name from "Ether" to "IndexMaker"
   - Updated native currency symbol from "ETH" to "IND"
   - Added WebSocket URL (wss://index.rpc.zeeve.net)
   - Added block explorer configuration

## Testing

To verify the configuration:

1. Connect your wallet to the dApp
2. Switch to the IndexMaker Chain from the network switcher
3. Verify that MetaMask shows:
   - Network Name: IndexMaker Chain
   - Chain ID: 111222333
   - Currency Symbol: IND
   - Correct RPC URL
4. Check that transactions link to the correct block explorer

## Notes

- The chain is configured as an Arbitrum Orbit chain (Layer 3)
- It uses the IND token as its native gas token
- The configuration supports both HTTP and WebSocket connections
- Block explorer integration is configured for transaction viewing
