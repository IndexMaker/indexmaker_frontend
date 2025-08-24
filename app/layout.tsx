import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/contexts/language-context";
import { QuoteProvider } from "@/contexts/quote-context";
import { ReduxProvider } from "@/provider/reduxProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import { initPostHog } from "../lib/posthog";
import { WalletProvider } from "@/contexts/wallet-context";
import {
    PHProvider,
    PostHogPageview
} from "../lib/posthog";
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
  // initPostHog();

  return (
    <html lang="en">
      <head>
        <script
          src="https://assets.calendly.com/assets/external/widget.js"
          async
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <WalletProvider>
          <PHProvider>
            <PostHogPageview />

            <ReduxProvider>
              <QuoteProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="light"
                  enableSystem={false}
                  forcedTheme="light"
                  disableTransitionOnChange
                >
                  <LanguageProvider>
                    {children}
                    <Toaster />
                  </LanguageProvider>
                </ThemeProvider>
              </QuoteProvider>
            </ReduxProvider>
          </PHProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
