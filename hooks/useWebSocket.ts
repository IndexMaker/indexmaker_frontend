import { IndexListEntry } from "@/types/index";
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

  const sendNewIndexOrder = (order: {
    address: string;
    symbol: string;
    side: "1" | "2";
    amount: string;
  }) => {
    const message = {
      standard_header: {
        msg_type: "NewIndexOrder",
        sender_comp_id: "FE",
        target_comp_id: "SERVER",
        seq_num: seqNumRef.current++,
        timestamp: new Date().toISOString(),
      },
      chain_id: 1,
      address: order.address,
      client_order_id: `O-${Date.now()}`,
      symbol: order.symbol,
      side: order.side,
      amount: order.amount,
      standard_trailer: {
        public_key: [],
        signature: [],
      },
    };

    sendMessage(message);
  };

  const requestQuoteAndWait = ({
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
    return new Promise((resolve) => {
      const quoteId = `Q-${symbol}-${Date.now()}`;
      quoteIdMap.current[quoteId] = symbol;

      quoteCallbacks.current[quoteId] = (quantity) => {
        resolve(quantity);
        delete quoteCallbacks.current[quoteId]; // cleanup
      };

      const message = {
        standard_header: {
          msg_type: "NewQuoteRequest",
          sender_comp_id: "CLIENT",
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
        sender_comp_id: "CLIENT",
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
            sender_comp_id: "CLIENT",
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
