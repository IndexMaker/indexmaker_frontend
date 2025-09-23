"use client";
import useQuoteSocket from "@/hooks/useWebSocket";
import { RootState } from "@/redux/store";
import { createContext, ReactNode, useContext } from "react";
import { useSelector } from "react-redux";

interface QuoteContextType {
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  indexPrices: Record<string, string>;

  sendMessage: (message: any) => void;

  sendNewIndexOrder: (order: any) => Promise<string>;
  sendCancelIndexOrder: (order: any) => Promise<void>;

  sendNewQuoteRequest: (order: any) => void;
  requestQuoteAndWait: (order: any) => Promise<number>;

  subscribeOrderFill: (id: string, cb: (pct: number) => void) => () => void;
  subscribeMintInvoice: (id: string, cb: (invoice: any) => void) => () => void;

  // NEW: listen for NAKs
  setNakHandler: (cb: (nak: any) => void) => void;
  setAckHandler: (cb: (nak: any) => void) => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
  amount?: number;
  network?: number;
}

export function QuoteProvider({
  children,
  amount = 1000,
  network = 8453,
}: Props) {
  const storedIndexes = useSelector((state: RootState) => state.index.indices);

  const {
    connect,
    disconnect,
    isConnected,
    indexPrices,
    sendMessage,
    sendNewIndexOrder,
    sendCancelIndexOrder,
    sendNewQuoteRequest,
    requestQuoteAndWait,
    subscribeOrderFill,
    subscribeMintInvoice,
    setNakHandler, // NEW
    setAckHandler,
  } = useQuoteSocket(storedIndexes, amount, network);

  return (
    <QuoteContext.Provider
      value={{
        connect,
        disconnect,
        isConnected,
        indexPrices,
        sendMessage,
        sendNewIndexOrder,
        sendCancelIndexOrder,
        sendNewQuoteRequest,
        requestQuoteAndWait,
        subscribeOrderFill,
        subscribeMintInvoice,
        setNakHandler, // NEW
        setAckHandler
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuoteContext() {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuoteContext must be used within a QuoteProvider");
  }
  return context;
}
