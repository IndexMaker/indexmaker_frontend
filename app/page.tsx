"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import SplashScreen from "@/app/SplashScreen";

// Dynamically import Dashboard with preloading
const Dashboard = dynamic(() => import("@/components/views/Dashboard/dashboard"), {
  ssr: false,
  loading: () => null, // No loading state needed since SplashScreen handles it
});

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    // Start preloading Dashboard immediately
    setDashboardReady(true);
  }, []);

  return (
    <>
      {loading ? (
        <>
          <SplashScreen
            onFinish={() => {
              setLoading(false);
            }}
          />
          {/* Preload Dashboard in background while splash screen is showing */}
          <div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}>
            {dashboardReady && (
              <Suspense fallback={null}>
                <Dashboard />
              </Suspense>
            )}
          </div>
        </>
      ) : (
        <Dashboard />
      )}
    </>
  );
}
