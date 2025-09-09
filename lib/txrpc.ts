// lib/txrpc.ts
export const BASES: Record<
  string,
  { rpc: string; explorer: string; symbol: string }
> = {
  "8453": {
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    symbol: "ETH",
  },
  "1": {
    rpc: "https://mainnet.ethereum.org",
    explorer: "https://mainnet.ethereum.org",
    symbol: "ETH",
  },
};

let __id = 1;
async function rpc<T = any>(
  rpcUrl: string,
  method: string,
  params: any[] = []
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: __id++, method, params }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

// hex → bigint helpers
const hexToBigInt = (h?: string | null) => (h ? BigInt(h) : BigInt(0));
const weiToEth = (wei: bigint) => Number(wei) / 1e18;
const weiToGwei = (wei: bigint) => Number(wei) / 1e9;
export const short = (s: string, n = 6) => `${s.slice(0, n)}…${s.slice(-4)}`;
export const toDec = (h?: string | null) => (h ? parseInt(h, 16) : undefined);

export type TxBundle = {
  hash: string;
  status: "success" | "failed" | "pending";
  blockNumber?: number;
  timestamp?: number; // seconds
  from: string;
  to?: string;
  valueEth: number;
  gasPriceGwei?: number;
  effectiveGasPriceGwei?: number;
  gasUsed?: number;
  feeEth?: number;
};

export async function fetchTxBundle(
  chainId: string,
  txHash: string
): Promise<TxBundle> {
  const net = BASES[chainId];
  if (!net) throw new Error(`Unsupported chain: ${chainId}`);
  const [tx, receipt] = await Promise.all([
    rpc<any>(net.rpc, "eth_getTransactionByHash", [txHash]),
    rpc<any>(net.rpc, "eth_getTransactionReceipt", [txHash]).catch(() => null),
  ]);

  // If mined, get block for timestamp
  let timestamp: number | undefined;
  if (receipt?.blockNumber) {
    const blk = await rpc<any>(net.rpc, "eth_getBlockByNumber", [
      receipt.blockNumber,
      false,
    ]);
    timestamp = toDec(blk?.timestamp);
  }

  const gasUsed = toDec(receipt?.gasUsed);
  const eff = hexToBigInt(receipt?.effectiveGasPrice);
  const legacy = hexToBigInt(tx?.gasPrice);
  const priceForFee = eff || legacy;

  return {
    hash: tx.hash,
    status: !receipt
      ? "pending"
      : receipt.status === "0x1"
      ? "success"
      : "failed",
    blockNumber: toDec(receipt?.blockNumber),
    timestamp,
    from: tx.from,
    to: tx.to ?? undefined,
    valueEth: weiToEth(hexToBigInt(tx.value)),
    gasPriceGwei: tx.gasPrice ? weiToGwei(hexToBigInt(tx.gasPrice)) : undefined,
    effectiveGasPriceGwei: receipt?.effectiveGasPrice
      ? weiToGwei(eff)
      : undefined,
    gasUsed,
    feeEth: gasUsed ? weiToEth(priceForFee * BigInt(gasUsed)) : undefined,
  };
}
