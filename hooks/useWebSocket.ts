import { IndexListEntry } from "@/types/index";
import { BrowserProvider, Wallet, ethers, hexlify } from "ethers";
import { useEffect, useRef, useState } from "react";

export default function useQuoteSocket(
  indexes: IndexListEntry[] = [],
  amount = 1000,
  Network = 8453
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [indexPrices, setPrices] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const quoteIdMap = useRef<Record<string, string>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seqNumRef = useRef(1);
  const quoteCallbacks = useRef<Record<string, (quantity: number) => void>>({});
  const reconnectAttempts = useRef(0);
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
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const currentTime = new Date().toISOString();
    const currentTimestamp = Date.now();
    const seqNum = seqNumRef.current++;

    // Create the unsigned payload
    const msgToSign = {
      standard_header: {
        msg_type: "NewIndexOrder",
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNum,
        timestamp: currentTime,
      },
      chain_id: 1,
      address: order.address,
      client_order_id: `O-${currentTimestamp}`,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
    };

    // Hash the payload
    const payloadBytes = ethers.toUtf8Bytes(JSON.stringify(msgToSign));
    // const hash = ethers.keccak256(payloadBytes);

    // // Sign the hash
    // const signature = await signer.signMessage(hexToBytes(hash));

    // // Get uncompressed public key (via recovered wallet)

    const messageHash = ethers.keccak256(payloadBytes);
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    const recoveredWallet = new Wallet(signature, provider);
    const pubKey = (recoveredWallet.signingKey as any).publicKey; // Uncompressed SEC1 format
    const sig = await recoveredWallet.signingKey.sign(messageHash);
    const _sig = hexlify(sig.r) + hexlify(sig.s).substring(2);
    // Construct final message with trailer
    const message = {
      ...msgToSign,
      standard_trailer: {
        public_key: [pubKey],
        signature: [_sig],
      },
    };

    sendMessage(message);
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
    }, 10000); // 🔁 every 5 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [indexes, isConnected, amount, Network]);

  function hexToBytes(hex: string): Uint8Array {
    if (hex.startsWith("0x")) hex = hex.slice(2);
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string");

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  return {
    connect,
    disconnect,
    isConnected,
    indexPrices,
    sendNewIndexOrder,
    sendNewQuoteRequest,
    requestQuoteAndWait,
    sendMessage,
  };
}
