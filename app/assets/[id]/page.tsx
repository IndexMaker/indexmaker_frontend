import { AssetDetailsView } from "@/components/invoice/asset-details-view";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { Suspense } from "react";

interface AssetPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  // Await the params to ensure they're resolved
  const { id } = await params;

  return (
    <Dashboard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <AssetDetailsView assetId={id} />
      </Suspense>
    </Dashboard>
  );
}
