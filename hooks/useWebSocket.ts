"use client";
import { IndexListEntry } from "@/types/index";
import {
  BrowserProvider,
  Signature,
  Wallet,
  ethers,
  hashMessage,
  hexlify,
  toUtf8Bytes,
  verifyMessage,
} from "ethers";
import { useEffect, useRef, useState } from "react";
import * as secp from "@noble/secp256k1";
import { keccak256, getAddress } from "ethers";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { getActiveWalletProvider } from "@/components/elements/transaction-modal";
import { hexToBytes } from "viem";
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
        new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data)));

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
  const wsQuotesRef = useRef<WebSocket | null>(null);
  const wsOrdersRef = useRef<WebSocket | null>(null);

  const [indexPrices, setPrices] = useState<Record<string, string>>({});
  const [isQuotesConnected, setIsQuotesConnected] = useState(false);
  const [isOrdersConnected, setIsOrdersConnected] = useState(false);

  // Back-compat alias: treat overall isConnected as "quotes connected"
  const isConnected = isQuotesConnected;

  const quoteIdMap = useRef<Record<string, string>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Separate seq nums per socket
  const seqQuoteRef = useRef(1);
  const seqOrderRef = useRef(1);

  const quoteCallbacks = useRef<Record<string, (quantity: number) => void>>({});
  const reconnectQuotesAttempts = useRef(0);
  const reconnectOrdersAttempts = useRef(0);
  const lastFillRef = useRef<Record<string, number>>({});
  const pendingInvoiceRef = useRef<Record<string, any>>({});

  const onNakCallbackRef = useRef<null | ((nak: any) => void)>(null);
  const setNakHandler = (cb: (nak: any) => void) => {
    onNakCallbackRef.current = cb;
  };
  const onAckCallbackRef = useRef<null | ((ack: any) => void)>(null);
  const setAckHandler = (cb: (ack: any) => void) => {
    onAckCallbackRef.current = cb;
  };
  const reconnectQuotesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectOrdersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reconnectQuotes = () => {
    if (reconnectQuotesTimeoutRef.current || wsQuotesRef.current) return;
    const timeout = Math.min(
      1000 * 2 ** reconnectQuotesAttempts.current,
      10000
    );
    reconnectQuotesTimeoutRef.current = setTimeout(() => {
      reconnectQuotesAttempts.current += 1;
      reconnectQuotesTimeoutRef.current = null;
      connectQuotes();
    }, timeout);
  };
  const reconnectOrders = () => {
    if (reconnectOrdersTimeoutRef.current || wsOrdersRef.current) return;
    const timeout = Math.min(
      1000 * 2 ** reconnectOrdersAttempts.current,
      10000
    );
    reconnectOrdersTimeoutRef.current = setTimeout(() => {
      reconnectOrdersAttempts.current += 1;
      reconnectOrdersTimeoutRef.current = null;
      connectOrders();
    }, timeout);
  };

  const connectQuotes = () => {
    if (wsQuotesRef.current) return;

    wsQuotesRef.current = new WebSocket(process.env.NEXT_PUBLIC_QUOTE_SERVER!);

    wsQuotesRef.current.onopen = () => {
      setIsQuotesConnected(true);
      reconnectQuotesAttempts.current = 0;
      if (reconnectQuotesTimeoutRef.current) {
        clearTimeout(reconnectQuotesTimeoutRef.current);
        reconnectQuotesTimeoutRef.current = null;
      }
    };

    wsQuotesRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.ref_seq_num !== undefined) {
          seqQuoteRef.current = data.ref_seq_num + 1;
        }
        if (data.standard_header?.msg_type === "IndexQuoteResponse") {
          const quoteId = data.client_quote_id;
          const symbol = quoteIdMap.current[quoteId];
          const quantity = parseFloat(data.quantity_possible);
          if (!symbol || !quantity) return;

          if (quoteCallbacks.current[quoteId]) {
            quoteCallbacks.current[quoteId](quantity);
          }

          const price = (amount / quantity).toFixed(2);
          setPrices((prev) => ({ ...prev, [symbol]: price }));
        }
      } catch (e) {
        console.error("Invalid FIX JSON from QUOTES server:", e);
      }
    };

    wsQuotesRef.current.onclose = () => {
      setIsQuotesConnected(false);
      wsQuotesRef.current = null;
      reconnectQuotes();
    };
  };

  const connectOrders = () => {
    if (wsOrdersRef.current) return;

    wsOrdersRef.current = new WebSocket(process.env.NEXT_PUBLIC_ORDER_SERVER!);

    wsOrdersRef.current.onopen = () => {
      setIsOrdersConnected(true);
      reconnectOrdersAttempts.current = 0;
      if (reconnectOrdersTimeoutRef.current) {
        clearTimeout(reconnectOrdersTimeoutRef.current);
        reconnectOrdersTimeoutRef.current = null;
      }
    };

    wsOrdersRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log(data)
        if (data.ref_seq_num !== undefined) {
          seqOrderRef.current = data.ref_seq_num + 1;
        }
        if (data.standard_header?.msg_type === "NAK") {
          console.warn("[WS NAK]", data.reason);
          // bubble up so FE can show an error instead of success
          if (onNakCallbackRef.current) {
            onNakCallbackRef.current(data);
          }
          return;
        }

        if (data.standard_header?.msg_type === "NewIndexOrder" || data.standard_header?.msg_type === "CancelIndexOrder") {
          onAckCallbackRef.current?.(data);
        }

        if (data.standard_header?.msg_type === "IndexOrderFill") {
          console.log("[WS FILL]", data.client_order_id, data.fill_rate);
          const id = data.client_order_id;
          const pct = Math.min(parseFloat(data.fill_rate ?? "0") * 100, 100);
          if (Number.isNaN(pct)) return;

          if (orderFillCallbacks.current[id]) {
            lastFillRef.current[id] = pct;
            orderFillCallbacks.current[id](pct);
          } else {
            const activeIds = Object.keys(orderFillCallbacks.current);
            if (activeIds.length === 1) {
              const onlyId = activeIds[0];
              console.debug("[HOOK] alias fill", id, "->", onlyId);
              lastFillRef.current[onlyId] = pct;
              orderFillCallbacks.current[onlyId](pct);
            } else {
              lastFillRef.current[id] = pct;
            }
          }
        }

        if (data.standard_header?.msg_type === "MintInvoice") {
          const id = data.client_order_id;

          if (mintInvoiceCallbacks.current[id]) {
            console.debug("[HOOK] deliver invoice", id);
            mintInvoiceCallbacks.current[id](data);
          } else {
            const activeIds = Object.keys(mintInvoiceCallbacks.current);
            if (activeIds.length === 1) {
              const onlyId = activeIds[0];
              console.debug("[HOOK] alias invoice", id, "->", onlyId);
              mintInvoiceCallbacks.current[onlyId](data);
            } else {
              console.debug("[HOOK] buffer invoice", id);
              pendingInvoiceRef.current[id] = data;
            }
          }
        }
      } catch (e) {
        console.error("Invalid FIX JSON from ORDERS server:", e);
      }
    };

    wsOrdersRef.current.onclose = () => {
      setIsOrdersConnected(false);
      wsOrdersRef.current = null;
      reconnectOrders();
    };
  };

  // Unified helpers
  const connect = () => {
    connectQuotes();
    connectOrders();
  };

  const disconnect = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    wsQuotesRef.current?.close();
    wsOrdersRef.current?.close();
  };

  // Route messages to the correct socket by msg_type (keeps back-compat if someone calls sendMessage)
  const sendQuoteMessage = (msg: any) => {
    if (wsQuotesRef.current?.readyState === WebSocket.OPEN) {
      wsQuotesRef.current.send(JSON.stringify(msg));
    }
  };
  const sendOrderMessage = (msg: any) => {
    if (wsOrdersRef.current?.readyState === WebSocket.OPEN) {
      wsOrdersRef.current.send(JSON.stringify(msg));
    }
  };
  const sendMessage = (msg: any) => {
    const type = msg?.standard_header?.msg_type;
    if (
      type === "NewIndexOrder" ||
      type === "CancelIndexOrder" ||
      type === "ReplaceIndexOrder" ||
      type === "CancelIndexReplaceRequest"
    ) {
      return sendOrderMessage(msg);
    }
    // Default to quotes socket for quote-related or unknown (legacy behavior used quotes)
    return sendQuoteMessage(msg);
  };

  // const sendNewIndexOrder = async (order: {
  //   address: string;
  //   symbol: string;
  //   side: "1" | "2";
  //   amount: string;
  // }) => {
  //   const seqNum = seqOrderRef.current++;
  //   const client_order_id = await generateClientId(
  //     Date.now().toString(),
  //     order.address,
  //     "8453",
  //     seqNum
  //   );

  //   let privHex = process.env.NEXT_PUBLIC_ADMIN_PK || "";
  //   const priv = h2b(privHex);

  //   const pub = secp.getPublicKey(priv, false); // 65B uncompressed
  //   const signerAddress = pubToAddress(pub);

  //   const timestamp = new Date().toISOString();

  //   const payload = {
  //     standard_header: {
  //       msg_type: "NewIndexOrder",
  //       sender_comp_id: "FE",
  //       target_comp_id: "SERVER",
  //       seq_num: seqNum,
  //       timestamp,
  //     },
  //     chain_id: 8453,
  //     address: signerAddress, // IMPORTANT: must match the signing key
  //     client_order_id,
  //     symbol: order.symbol,
  //     side: order.side,
  //     amount: order.amount,
  //   };

  //   const minimal = getMinimalSignPayload(payload); // { msg_type, id }
  //   const hash = sha256(toUtf8Bytes(JSON.stringify(minimal))); // Uint8Array(32)

  //   const sig = secp.signSync(hash, priv, { canonical: true, der: false }); // 64B r||s
  //   const signatureHex = ("0x" + b2h(sig)) as `0x${string}`;
  //   const pubKeyHex = ("0x" + b2h(pub)) as `0x${string}`;

  //   if (!secp.verify(sig, hash, pub)) {
  //     console.error("Local verify failed — check minimal JSON / hash / signature");
  //   }

  //   const message = {
  //     ...payload,
  //     standard_trailer: {
  //       public_key: [pubKeyHex], // 65B uncompressed SEC1
  //       signature: [signatureHex], // 64B r||s
  //     },
  //   };

  //   pendingInvoiceRef.current = {}; // clear stale buffered invoices
  //   lastFillRef.current = {}; // clear stale last fill cache
  //   console.debug("[HOOK] sendNewIndexOrder client_order_id", client_order_id);

  //   sendOrderMessage(message);
  //   return client_order_id;
  // };

  const sendNewIndexOrder = async (order: {
    address: `0x${string}`; // user's wallet address
    symbol: string;
    side: "1" | "2";
    amount: string;
  }) => {
    // tiny inline helpers kept inside the function
    const hexToBytes = (hex: string) => {
      const h = hex.startsWith("0x") ? hex.slice(2) : hex;
      const out = new Uint8Array(h.length / 2);
      for (let i = 0; i < out.length; i++)
        out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
      return out;
    };
    const bytesToHex0x = (b: Uint8Array) =>
      ("0x" +
        Array.from(b)
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")) as `0x${string}`;

    const seqNum = seqOrderRef.current++;

    // 1) connect wallet and ensure it matches order.address
    const eth = getActiveWalletProvider();
    if (!eth) throw new Error("No injected wallet found");
    const [account] = await eth.request({ method: "eth_requestAccounts" });
    console.log(getAddress(account), getAddress(order.address));
    if (getAddress(account) !== getAddress(order.address)) {
      throw new Error("Connected wallet doesn't match order.address");
    }

    // 2) build ID & exact signable string BE uses (no spaces, fixed key order)
    const client_order_id = await generateClientId(
      Date.now().toString(),
      order.address,
      "8453",
      seqNum
    );
    const msgType = "NewIndexOrder";
    const signable = `{"msg_type":"${msgType}","id":"${client_order_id}"}`;

    // 3) have wallet sign (EIP-191 personal_sign → 65B r||s||v)
    let sigRSV: `0x${string}`;
    try {
      sigRSV = await eth.request({
        method: "personal_sign",
        params: [signable, account],
      });
    } catch {
      // some providers reverse params
      sigRSV = await eth.request({
        method: "personal_sign",
        params: [account, signable],
      });
    }
    const parsed = Signature.from(sigRSV); // exposes r, s, v (ethers v6)

    // 4) recover uncompressed SEC1 pubkey (65B, 0x04…) using noble
    const digestHex = hashMessage(signable); // keccak("\x19Ethereum Signed Message:\n" + len + signable)
    const digestBytes = hexToBytes(digestHex);
    const vNum =
      typeof parsed.v === "bigint" ? Number(parsed.v) : (parsed.v as number);
    const recovery = vNum >= 27 ? vNum - 27 : vNum & 1; // 0 or 1
    const rsHex = `0x${parsed.r.slice(2)}${parsed.s.slice(2)}` as `0x${string}`; // 64B r||s
    const pubBytes = secp.recoverPublicKey(
      digestBytes,
      hexToBytes(rsHex),
      recovery,
      false
    ); // uncompressed
    const public_key = bytesToHex0x(pubBytes); // "0x04…", 65 bytes

    // safety check: recovered addr must equal user address
    const recoveredAddr = getAddress(verifyMessage(signable, sigRSV));
    if (recoveredAddr !== getAddress(order.address)) {
      throw new Error("Signature does not recover to order.address");
    }

    const message = {
      standard_header: {
        msg_type: msgType,
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNum,
        timestamp: new Date().toISOString(),
      },
      chain_id: 8453,
      address: order.address, // user address (BE derives from public_key)
      client_order_id,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      standard_trailer: {
        public_key: [public_key], // 65B uncompressed SEC1 (0x04…)
        signature: [rsHex], // 64B r||s (no DER, no v)
      },
    };

    pendingInvoiceRef.current = {};
    lastFillRef.current = {};
    console.debug("[HOOK] sendNewIndexOrder client_order_id", client_order_id);

    sendOrderMessage(message);
    return client_order_id;
  };

  const sendCancelIndexOrder = async (order: {
    address: `0x${string}`; // must match the user wallet used for NewIndexOrder
    symbol: string;
    side: "1" | "2"; // must match what you sent earlier
    amount: string; // must match what you sent earlier
    client_order_id: string; // EXACTLY the id you created for NewIndexOrder
  }) => {
    const eth = getActiveWalletProvider();
    if (!eth) throw new Error("No injected wallet found");

    // Ensure the connected wallet matches order.address (same signer as NewIndexOrder)
    const [account] = await eth.request({ method: "eth_requestAccounts" });
    if (getAddress(account) !== getAddress(order.address)) {
      throw new Error("Connected wallet doesn't match order.address");
    }

    const seqNum = seqOrderRef.current;
    const msgType = "CancelIndexOrder";
    const signable = `{"msg_type":"${msgType}","id":"${order.client_order_id}"}`;

    // Request EIP-191 personal_sign
    let sigRSV: `0x${string}`;
    try {
      sigRSV = await eth.request({
        method: "personal_sign",
        params: [signable, account],
      });
    } catch {
      // some providers reverse params
      sigRSV = await eth.request({
        method: "personal_sign",
        params: [account, signable],
      });
    }

    // Recover uncompressed SEC1 pubkey (0x04… 65B)
    const digestHex = hashMessage(signable);
    const hexToBytesLocal = (hex: string) => {
      const h = hex.startsWith("0x") ? hex.slice(2) : hex;
      const out = new Uint8Array(h.length / 2);
      for (let i = 0; i < out.length; i++)
        out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
      return out;
    };
    const bytesToHex0x = (b: Uint8Array) =>
      ("0x" +
        Array.from(b)
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")) as `0x${string}`;

    const parsed = Signature.from(sigRSV);
    const vNum =
      typeof parsed.v === "bigint" ? Number(parsed.v) : (parsed.v as number);
    const recovery = vNum >= 27 ? vNum - 27 : vNum & 1; // 0 or 1
    const rsHex = `0x${parsed.r.slice(2)}${parsed.s.slice(2)}` as `0x${string}`;

    const pubBytes = secp.recoverPublicKey(
      hexToBytesLocal(digestHex),
      hexToBytesLocal(rsHex),
      recovery,
      false
    );
    const public_key = bytesToHex0x(pubBytes);

    // Safety: recovered address must equal order.address
    const recoveredAddr = getAddress(verifyMessage(signable, sigRSV));
    if (recoveredAddr !== getAddress(order.address)) {
      throw new Error("Signature does not recover to order.address");
    }

    // Assemble message (fields MUST match NewIndexOrder)
    const message = {
      standard_header: {
        msg_type: msgType,
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNum,
        timestamp: new Date().toISOString(),
      },
      chain_id: 8453,
      address: order.address,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      client_order_id: order.client_order_id,
      standard_trailer: {
        public_key: [public_key], // 65B uncompressed SEC1
        signature: [rsHex], // 64B r||s (no v)
      },
    };

    sendOrderMessage(message);
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
          seq_num: seqQuoteRef.current++,
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

      sendQuoteMessage(message);
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
        seq_num: seqQuoteRef.current++,
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

    sendQuoteMessage(message);
    return client_quote_id;
  };

  // ✅ Setup real-time quote polling (quotes socket only)
  useEffect(() => {
    if (!isQuotesConnected) {
      connectQuotes();
      return;
    }
    if (indexes.length === 0) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      indexes.forEach((index) => {
        const quoteId = `Q-${index.ticker}-${Date.now()}`;
        quoteIdMap.current[quoteId] = index.ticker;
        const message = {
          standard_header: {
            msg_type: "NewQuoteRequest",
            sender_comp_id: "FE",
            target_comp_id: "SERVER",
            seq_num: seqQuoteRef.current++,
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
        sendQuoteMessage(message);
      });
    }, 10000); // 🔁 every 10 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [indexes, isQuotesConnected, amount, Network]);

  const subscribeOrderFill = (id: string, cb: (pct: number) => void) => {
    orderFillCallbacks.current[id] = cb;
    if (lastFillRef.current[id] != null) cb(lastFillRef.current[id]); // replay
    return () => {
      delete orderFillCallbacks.current[id];
    };
  };

  const subscribeMintInvoice = (id: string, cb: (invoice: any) => void) => {
    console.debug(
      "[HOOK] subscribeMintInvoice",
      id,
      "pending?",
      !!pendingInvoiceRef.current[id]
    );
    mintInvoiceCallbacks.current[id] = cb;
    if (pendingInvoiceRef.current[id]) {
      const inv = pendingInvoiceRef.current[id];
      delete pendingInvoiceRef.current[id];
      cb(inv); // flush buffer
    }
    return () => {
      delete mintInvoiceCallbacks.current[id];
    };
  };

  return {
    // connections
    connect,
    connectQuotes,
    connectOrders,
    disconnect,

    // status
    isConnected, // alias of quotes
    isQuotesConnected,
    isOrdersConnected,

    // data/state
    indexPrices,

    // actions
    sendNewIndexOrder,
    sendCancelIndexOrder,
    setNakHandler,
    setAckHandler,
    sendNewQuoteRequest,
    requestQuoteAndWait,

    // low-level (kept for back-compat; routes by msg_type)
    sendMessage,

    // subscriptions
    subscribeOrderFill,
    subscribeMintInvoice,

    // optional helpers
    setSigningPrivateKey,
    getSigningPublicKey,
    getSigningAddress,
  };
}
