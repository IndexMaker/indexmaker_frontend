import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { Calculator } from "lucide-react";

export default function CalculatorLoading() {
  return (
    <Dashboard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-primary animate-pulse" />
            <h1 className="text-3xl font-bold">Tax Calculator</h1>
          </div>
          <p className="text-muted-foreground text-lg">Loading calculator...</p>
        </div>

        <div className="grid gap-6">
          <Card className="bg-foreground">
            <CardHeader>
              <div className="h-6 bg-foreground rounded animate-pulse" />
              <div className="h-4 bg-foreground rounded animate-pulse w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-foreground rounded animate-pulse" />
                <div className="h-10 bg-foreground rounded animate-pulse" />
                <div className="h-10 bg-foreground rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-foreground">
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </Dashboard>
  );
}
