import { redirect } from "next/navigation";

interface AssetPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  // Assets feature is disabled - redirect to main assets page
  redirect("/assets");
}
