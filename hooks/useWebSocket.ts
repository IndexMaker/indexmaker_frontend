"use client";
import { IndexListEntry } from "@/types/index";
import { BrowserProvider, Wallet, ethers, hexlify, toUtf8Bytes } from "ethers";
import { useEffect, useRef, useState } from "react";
import * as secp from "@noble/secp256k1";
import { keccak256, getAddress } from "ethers";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
const enc = new TextEncoder();

export default function useQuoteSocket(
  indexes: IndexListEntry[] = [],
  amount = 1000,
  Network = 8453
) {
  const concatBytes = (...arrs: Uint8Array[]) => {
    const len = arrs.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(len);
    let off = 0;
    for (const a of arrs) {
      out.set(a, off);
      off += a.length;
    }
    return out;
  };
  const b2h = (u8: Uint8Array) => secp.utils.bytesToHex(u8);
  const h2b = (hex: string) =>
    secp.utils.hexToBytes(hex.startsWith("0x") ? hex.slice(2) : hex);

  // v1: provide sync hash + hmac for signSync
  secp.utils.sha256Sync = (...msgs: Uint8Array[]) =>
    sha256(concatBytes(...msgs));
  secp.utils.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) =>
    hmac(sha256, key, concatBytes(...msgs));

  // derive EVM address from uncompressed pubkey (0x04 + X + Y)
  const pubToAddress = (pub: Uint8Array): `0x${string}` => {
    const hash = keccak256(pub.slice(1)); // drop 0x04 prefix
    return getAddress(
      ("0x" + hash.slice(26)) as `0x${string}`
    ) as `0x${string}`;
  };

  // EXACTLY like your server sample
  function getMinimalSignPayload(msg: any) {
    const { msg_type } = msg.standard_header;
    if (msg_type === "NewIndexOrder" || msg_type === "CancelIndexOrder") {
      return { msg_type, id: msg.client_order_id };
    } else if (
      msg_type === "NewQuoteRequest" ||
      msg_type === "CancelQuoteRequest"
    ) {
      return { msg_type, id: msg.client_quote_id };
    }
    throw new Error("Unsupported msg_type");
  }

  const signingPrivHexRef = useRef<string | null>(null);

  const setSigningPrivateKey = (hex: string) => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hex))
      throw new Error("Private key must be 0x + 64 hex chars");
    signingPrivHexRef.current = hex;
    if (typeof window !== "undefined")
      localStorage.setItem("imSigningKeyHex", hex);
  };

  // Optional helpers if you want to check what address/pubkey you’re using
  const getSigningPublicKey = () => {
    const hex =
      signingPrivHexRef.current ||
      (typeof window !== "undefined"
        ? localStorage.getItem("imSigningKeyHex")
        : null);
    if (!hex) return null;
    const priv = h2b(hex);
    const pub = secp.getPublicKey(priv, false);
    return ("0x" + b2h(pub)) as `0x${string}`;
  };
  const getSigningAddress = () => {
    const hex =
      signingPrivHexRef.current ||
      (typeof window !== "undefined"
        ? localStorage.getItem("imSigningKeyHex")
        : null);
    if (!hex) return null;
    const priv = h2b(hex);
    const pub = secp.getPublicKey(priv, false);
    return pubToAddress(pub);
  };
  const bytesToHex = (u8: Uint8Array) =>
    Array.from(u8)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const sha256Bytes = async (data: Uint8Array) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", data));

  async function generateClientId(
    timestamp: string,
    address: string,
    chainId: number | string | bigint,
    seqNum: number
  ): Promise<string> {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const data = `${timestamp}${address}${chainId}${seqNum}`;
    const hash = await sha256Bytes(enc.encode(data));
    const hex = bytesToHex(hash);
    const pick = (i: number) => A[parseInt(hex.slice(i, i + 2), 16) % 26];
    const code1 = `${pick(0)}${pick(2)}${pick(4)}`;
    const code2 = `${pick(6)}${pick(8)}${pick(10)}`;
    const code3 = `${pick(12)}${pick(14)}${pick(16)}`;
    const numSuffix = (parseInt(hex.slice(18, 22), 16) % 9000) + 1001;
    return `${code1}-${code2}-${code3}-${numSuffix}`;
  }
  const orderFillCallbacks = useRef<Record<string, (pct: number) => void>>({});
  const mintInvoiceCallbacks = useRef<Record<string, (invoice: any) => void>>(
    {}
  );
  const wsRef = useRef<WebSocket | null>(null);
  const [indexPrices, setPrices] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const quoteIdMap = useRef<Record<string, string>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seqNumRef = useRef(1);
  const quoteCallbacks = useRef<Record<string, (quantity: number) => void>>({});
  const reconnectAttempts = useRef(0);
  const lastFillRef = useRef<Record<string, number>>({});
  const pendingInvoiceRef = useRef<Record<string, any>>({});

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnect = () => {
    if (reconnectTimeoutRef.current || wsRef.current) return;

    const timeout = Math.min(1000 * 2 ** reconnectAttempts.current, 10000); // max 10s
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      reconnectTimeoutRef.current = null;
      connect(); // try to reconnect
    }, timeout);
  };
  const connect = () => {
    if (wsRef.current) return;

    wsRef.current = new WebSocket(process.env.NEXT_PUBLIC_QUOTE_SERVER!);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    wsRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.ref_seq_num !== undefined) {
          seqNumRef.current = data.ref_seq_num + 1;
        }
        if (data.standard_header?.msg_type === "IndexQuoteResponse") {
          const quoteId = data.client_quote_id;
          const symbol = quoteIdMap.current[data.client_quote_id];
          const quantity = parseFloat(data.quantity_possible);
          if (!symbol || !quantity) return;

          if (quoteCallbacks.current[quoteId]) {
            quoteCallbacks.current[quoteId](quantity);
          }

          const price = (amount / quantity).toFixed(2);
          setPrices((prev) => ({ ...prev, [symbol]: price }));
        }

        if (data.standard_header?.msg_type === "IndexOrderFill") {
          console.log("[WS FILL]", data.client_order_id, data.fill_rate);
          const id = data.client_order_id;
          const pct = Math.min(parseFloat(data.fill_rate ?? "0") * 100, 100);
          if (!Number.isNaN(pct)) {
            lastFillRef.current[id] = pct;
            if (orderFillCallbacks.current[id]) {
              orderFillCallbacks.current[id](pct);
            }
          }
          return;
        }
        if (data.standard_header?.msg_type === "MintInvoice") {
          console.log("[WS INVOICE]", data.client_order_id, data.payment_id);
          const id = data.client_order_id;
          if (mintInvoiceCallbacks.current[id]) {
            mintInvoiceCallbacks.current[id](data);
          } else {
            pendingInvoiceRef.current[id] = data;
          }
          return;
        }
      } catch (e) {
        console.error("Invalid FIX JSON from server:", e);
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      reconnect();
    };
  };

  const disconnect = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    wsRef.current?.close();
  };

  const sendMessage = (msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const sendNewIndexOrder = async (order: {
    address: string;
    symbol: string;
    side: "1" | "2";
    amount: string;
  }) => {
    const currentTime = new Date().toISOString();
    const seqNum = seqNumRef.current++;
    const client_order_id = await generateClientId(
      Date.now().toString(),
      order.address,
      "8453",
      seqNum
    );

    let privHex = process.env.NEXT_PUBLIC_ADMIN_PK || "";
    const priv = h2b(privHex);

    // 2) derive pubkey + address (this is what backend will authorize)
    const pub = secp.getPublicKey(priv, false); // 65B uncompressed
    const signerAddress = pubToAddress(pub);

    // 3) build message
    const timestamp = new Date().toISOString();

    const payload = {
      standard_header: {
        msg_type: "NewIndexOrder",
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNum,
        timestamp,
      },
      chain_id: 8453,
      address: signerAddress, // IMPORTANT: must match the signing key
      client_order_id,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
    };

    // 4) sign EXACT minimal payload
    const minimal = getMinimalSignPayload(payload); // { msg_type, id }
    const hash = sha256(toUtf8Bytes(JSON.stringify(minimal))); // Uint8Array(32)

    // 5) noble v1 sync sign (needs sha256Sync + hmacSha256Sync set above)
    const sig = secp.signSync(hash, priv, { canonical: true, der: false }); // 64B r||s
    const signatureHex = ("0x" + b2h(sig)) as `0x${string}`;
    const pubKeyHex = ("0x" + b2h(pub)) as `0x${string}`;

    // optional local verify
    if (!secp.verify(sig, hash, pub)) {
      console.error(
        "Local verify failed — check minimal JSON / hash / signature"
      );
    }

    const message = {
      ...payload,
      standard_trailer: {
        public_key: [pubKeyHex], // 65B uncompressed SEC1
        signature: [signatureHex], // 64B r||s
      },
    };

    sendMessage(message);
    return client_order_id;
  };

  const requestQuoteAndWait = async ({
    address,
    symbol,
    side,
    amount,
  }: {
    address: string;
    symbol: string;
    side: "1" | "2";
    amount: string;
  }): Promise<number> => {
    return new Promise(async (resolve) => {
      const quoteId = `Q-${symbol}-${Date.now()}`;
      quoteIdMap.current[quoteId] = symbol;
      quoteCallbacks.current[quoteId] = (quantity) => {
        resolve(quantity);
        delete quoteCallbacks.current[quoteId]; // cleanup
      };

      const message = {
        standard_header: {
          msg_type: "NewQuoteRequest",
          sender_comp_id: "FE",
          target_comp_id: "SERVER",
          seq_num: seqNumRef.current++,
          timestamp: new Date().toISOString(),
        },
        chain_id: 1,
        address,
        client_quote_id: quoteId,
        symbol,
        side,
        amount,
        standard_trailer: {
          public_key: [],
          signature: [],
        },
      };

      sendMessage(message);
    });
  };

  const sendNewQuoteRequest = ({
    address,
    symbol,
    side,
    amount,
  }: {
    address: string;
    symbol: string;
    side: "1" | "2";
    amount: string;
  }) => {
    const client_quote_id = `Q-${Date.now()}`;
    quoteIdMap.current[client_quote_id] = symbol;

    const message = {
      standard_header: {
        msg_type: "NewQuoteRequest",
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNumRef.current++,
        timestamp: new Date().toISOString(),
      },
      chain_id: 1,
      address,
      client_quote_id,
      symbol,
      side,
      amount,
      standard_trailer: {
        public_key: [],
        signature: [],
      },
    };

    sendMessage(message);
    return client_quote_id;
  };

  // ✅ Setup real-time quote polling
  useEffect(() => {
    if (!isConnected) {
      connect();
      return;
    }
    if (indexes.length === 0) return;

    // Clear any previous interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      indexes.forEach((index) => {
        if (index.ticker !== "SY100") return;
        const quoteId = `Q-${index.ticker}-${Date.now()}`;
        quoteIdMap.current[quoteId] = index.ticker;
        const message = {
          standard_header: {
            msg_type: "NewQuoteRequest",
            sender_comp_id: "FE",
            target_comp_id: "SERVER",
            seq_num: seqNumRef.current++,
            timestamp: new Date().toISOString(),
          },
          chain_id: Network,
          address: index.address,
          client_quote_id: quoteId,
          symbol: index.ticker,
          side: "1",
          amount: amount.toString(),
          standard_trailer: {
            public_key: [],
            signature: [],
          },
        };
        sendMessage(message);
      });
    }, 10000); // 🔁 every 10 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [indexes, isConnected, amount, Network]);

  const subscribeOrderFill = (id: string, cb: (pct: number) => void) => {
    orderFillCallbacks.current[id] = cb;
    if (lastFillRef.current[id] != null) cb(lastFillRef.current[id]); // replay
    return () => {
      delete orderFillCallbacks.current[id];
    };
  };

  const subscribeMintInvoice = (id: string, cb: (invoice: any) => void) => {
    mintInvoiceCallbacks.current[id] = cb;
    if (pendingInvoiceRef.current[id]) {
      cb(pendingInvoiceRef.current[id]); // flush buffer
      delete pendingInvoiceRef.current[id];
    }
    return () => {
      delete mintInvoiceCallbacks.current[id];
    };
  };

  return {
    connect,
    disconnect,
    isConnected,
    indexPrices,
    sendNewIndexOrder,
    sendNewQuoteRequest,
    requestQuoteAndWait,
    sendMessage,
    subscribeOrderFill,
    subscribeMintInvoice,
  };
}
