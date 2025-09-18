"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/views/Dashboard/dashboard";
import SplashScreen from "@/app/SplashScreen";

export default function Home() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {}, []);

  return (
    <>
      {loading ? (
        <SplashScreen
          onFinish={() => {
            setLoading(false);
          }}
        />
      ) : (
        <Dashboard />
      )}
    </>
  );
}
