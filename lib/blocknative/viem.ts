import { createPublicClient, http } from "viem";
import { mainnet, base, arbitrum } from "viem/chains";
import { defineChain } from "viem";

// Define custom Orbit chain
const orbitChain = defineChain({
  id: 111222333,
  name: 'IndexMaker Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'IndexMaker',
    symbol: 'IND',
  },
  rpcUrls: {
    default: {
      http: ['https://index.rpc.zeeve.net'],
      webSocket: ['wss://index.rpc.zeeve.net'],
    },
    public: {
      http: ['https://index.rpc.zeeve.net'],
      webSocket: ['wss://index.rpc.zeeve.net'],
    },
  },
  blockExplorers: {
    default: {
      name: 'IndexMaker Explorer',
      url: 'https://index.explorer.zeeve.net',
    },
  },
});

// Map chain IDs to Viem chains
const chainMap = {
  "0xa4b1": arbitrum, // Arbitrum One
  "0x6A11E3D": orbitChain, // Custom Orbit Chain (111222333)
  "0x1": mainnet, // Ethereum Mainnet
  "0x2105": base, // Base Mainnet
};

export const getViemClient = (chainId: string) => {
  const chain = chainMap[chainId as keyof typeof chainMap] || arbitrum; // Default to Arbitrum if unknown
  return createPublicClient({
    chain,
    transport: http(), // Uses default RPC URL for the chain
  });
};
