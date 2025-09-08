
import { InvoiceDetailsView } from "@/components/invoice/invoice-details-view";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { Suspense } from "react";

interface InvoicePageProps {
  params: Promise<{
    chain_id: string;
    address: string;
    client_order_id: string;
  }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  // Await the params promise
  const { chain_id, address, client_order_id } = await params;

  return (
    <Dashboard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <InvoiceDetailsView
          client_order_id={client_order_id}
          address={address}
          chain_id={chain_id}
        />
      </Suspense>
    </Dashboard>
  );
}
