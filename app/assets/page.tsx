import Dashboard from "@/components/views/Dashboard/dashboard";
import { Coins, Construction } from "lucide-react";
import Link from "next/link";

export default function AssetsPage() {
  return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <Construction className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">
          Asset Inventory Coming Soon
        </h1>
        <p className="text-muted-foreground max-w-md mb-6">
          The asset inventory browser is under development. Check back soon for a complete view of your holdings.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Coins className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </Dashboard>
  );
}
