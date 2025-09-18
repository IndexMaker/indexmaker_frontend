import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/language-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "@/provider/reduxProvider";
// import { initPostHog } from "../lib/posthog";
import {
  PHProvider,
  // PostHogErrorTracker,
  PostHogPageview,
} from "../lib/posthog";
import SessionTracker from "../components/posthog/sessionTracker";
import { WalletProvider } from "@/contexts/wallet-context";
import { QuoteProvider } from "@/contexts/quote-context";
import SubscriptionTrigger from "@/components/elements/subscription-trigger";
import AnnouncementBanner from "@/components/elements/AnnouncementBanner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IndexMaker",
  description: "IndexMaker MVP",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://assets.calendly.com/assets/external/widget.js"
          async
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-[calc(100vh-46px)] antialiased bg-foreground`}
      >
        <WalletProvider>
          <PHProvider>
            <PostHogPageview />
            {/* <PostHogErrorTracker /> */}
            <ReduxProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
              >
                <QuoteProvider>
                  <LanguageProvider>
                    {children}
                    <Toaster />
                    <SubscriptionTrigger />
                  </LanguageProvider>
                </QuoteProvider>
              </ThemeProvider>
            </ReduxProvider>
          </PHProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
