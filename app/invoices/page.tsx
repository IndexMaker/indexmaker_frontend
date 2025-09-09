import { InvoiceExplorerDashboard } from "@/components/invoice/invoice-explorer-dashboard";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { Suspense } from "react";

export default function InvoicePage() {
  return (
    <Dashboard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <InvoiceExplorerDashboard />
      </Suspense>
    </Dashboard>
  );
}
