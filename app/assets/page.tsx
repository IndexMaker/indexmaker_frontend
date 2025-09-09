import { AssetInventoryBrowser } from "@/components/invoice/asset-inventory-browser";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function AssetsPage() {
  return redirect("/invoices");
  return (
    <Dashboard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <AssetInventoryBrowser />
      </Suspense>
    </Dashboard>
  );
}
