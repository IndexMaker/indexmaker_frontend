"use client";

import type React from "react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useWallet } from "@/contexts/wallet-context";
import { Calculator, TrendingUp, X, Users, FileScanIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import EcosystemSvg from "../icons/ecosystem";
import Feedback from "../icons/feedback";
import IndexMaker from "../icons/indexmaker";
import IndexMakerDoc from "../icons/indexmakerDoc";
import IndexMakerLogo from "../icons/indexmakerLogo";
import RightArrow from "../icons/right-arrow";
import TOS from "../icons/tos";
import { ThemeToggle } from "../theme-toggle";
import GithubLogo from "../icons/githublogo";
import Slack from "../icons/slack";
import Github from "../icons/github";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const { wallet, isConnected, isAdmin } = useWallet();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  // Function to check if a route is active
  const isRouteActive = (href: string): boolean => {
    // Exact match for home page
    if (href === "/" && pathname === "/") {
      return true;
    }

    // For other routes, check if pathname starts with href (for nested routes)
    // But only if href is not the home page
    if (href !== "/" && pathname.startsWith(href)) {
      return true;
    }

    return false;
  };
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      } else {
        // setOpen(false)
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed text-xs font-bold inset-y-0 left-0 z-50 flex flex-col bg-foreground border-r border-accent lg:relative lg:border-none lg:z-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-[52px] px-[10px]" : "w-[250px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-[52px] items-center",
            collapsed ? "justify-center" : "px-5"
          )}
        >
          <Link href="/" className="flex items-center">
            {collapsed ? (
              <IndexMaker className="object-cover text-muted w-6 h-6" />
            ) : (
              // <Logo
              //   className="w-40 h-6 dark:text-ring"
              //   color={theme == "dark" ? "#D0CECE" : "#2470ff"}
              // />
              //   <Image
              //     src={DARK}
              //     alt={"LOGO"}
              //     width={90}
              //     height={24}
              //     className="text-primary"
              //   />
              <IndexMakerLogo
                className="w-36 h-8 dark:text-ring "
                color={theme == "dark" ? "#D0CECE" : "#2470ff"}
              />
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-3 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6 text-primary" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col justify-between h-full">
          <nav
            className={cn(
              "space-y-1 text-xs font-bold",
              collapsed ? "px-0" : "px-[10px]"
            )}
          >
            {/* {isConnected && wallet && isAdmin ? (
              <NavItem
                href="/private-dashboard"
                active={isRouteActive("/private-dashboard")}
                className="text-[13px] text-secondary py-[6px] px-[10px] h-[32px]"
                icon={LayoutDashboard}
                collapsed={collapsed}
                iconClassName={"p-[1px]"}
              >
                {t("common.dashboard")}
              </NavItem>
            ) : (
              <></>
            )} */}
            <NavItem
              href="/"
              active={isRouteActive("/")}
              className="text-[13px] text-secondary py-[6px] px-[10px] h-[32px]"
              icon={TrendingUp}
              collapsed={collapsed}
            >
              {t("common.index")}
            </NavItem>
            <NavItem
              href="/ecosystem"
              active={isRouteActive("/ecosystem")}
              className="text-[13px] text-secondary py-[6px] px-[10px] h-[32px]"
              icon={EcosystemSvg}
              collapsed={collapsed}
              iconClassName={"p-[1px]"}
            >
              {t("common.curators")}
            </NavItem>
            <NavItem
              href="/invoices"
              active={isRouteActive("/invoices")}
              className="text-[13px] text-secondary py-[6px] px-[10px] h-[32px]"
              icon={FileScanIcon}
              collapsed={collapsed}
            >
              {t("common.invoices")}
            </NavItem>
            <NavItem
              href="/tax-optimizer"
              active={isRouteActive("/tax-optimizer")}
              className="text-[13px] text-secondary py-[6px] px-[10px] h-[32px]"
              icon={Calculator}
              collapsed={collapsed}
            >
              {t("common.taxCalculator")}
            </NavItem>
          </nav>

          <div
            className={cn(
              "pt-4 text-xs font-bold",
              collapsed ? "hidden" : "px-0"
            )}
          >
            <div className={cn("space-y-1", collapsed ? "px-0" : "px-[14px]")}>
              {/* <NavItem
                href="/analytics"
                active={isRouteActive("/analytics")}
                className="text-muted h-[28px] px-[6px] py-[2px]"
                icon={AnalyticsSvg}
                collapsed={collapsed}
                iconClassName="mr-[2px]"
              >
                {t("common.analytics")}
              </NavItem> */}
              <NavItem
                href="/private-dashboard"
                icon={Users}
                active={isRouteActive("/private-dashboard")}
                className="text-muted h-[28px] px-[6px] py-[2px]"
                collapsed={collapsed}
                external={true}
                iconClassName="mr-[2px] text-muted"
              >
                {t("common.marketInsights")}
              </NavItem>
              <NavItem
                href="https://github.com/IndexMaker/index-maker"
                icon={Github}
                external
                className="text-muted h-[28px] px-[6px] py-[2px]"
                collapsed={collapsed}
                iconClassName="mr-[2px] text-muted"
              >
                {t("common.openSource")}
              </NavItem>

              <NavItem
                href="https://psymm.gitbook.io/indexmaker"
                icon={IndexMaker}
                external
                className="text-muted h-[28px] px-[6px] py-[2px]"
                collapsed={collapsed}
                iconClassName="mr-[2px] text-muted"
              >
                {t("common.indexmakerDocs")}
              </NavItem>
              {/* <NavItem
                active={isRouteActive('/contact-us')}
                href="/contact-us"
                icon={Feedback}
                className="text-muted h-[28px] px-[6px] py-[2px]"
                collapsed={collapsed}
                external={true}
                iconClassName="mr-[2px]"
              >
                {t("common.support")}
              </NavItem> */}
              <NavItem
                href="https://psymm.gitbook.io/indexmaker/index-maker-hld/compliance/terms-of-use"
                icon={TOS}
                external
                className="text-muted h-[28px] px-[6px] py-[2px]"
                collapsed={collapsed}
                iconClassName="mr-[2px]"
              >
                {t("common.termsOfUse")}
              </NavItem>
            </div>
          </div>
        </div>

        {/* Theme toggle and collapse/expand button */}
        <div
          className={cn(
            "flex h-16 items-center text-zinc-400 hover:text-secondary",
            collapsed
              ? "justify-center"
              : "pt-[24px] pr-[10px] pb-[16px] pl-[16px]"
          )}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                className="hover:bg-transparent cursor-pointer hover:text-primary h-4 w-4 mb-4"
              >
                <div>
                  <svg
                    width="20"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="#e5e5e5"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.14645 11.1464C1.95118 11.3417 1.95118 11.6583 2.14645 11.8536C2.34171 12.0488 2.65829 12.0488 2.85355 11.8536L6.85355 7.85355C7.04882 7.65829 7.04882 7.34171 6.85355 7.14645L2.85355 3.14645C2.65829 2.95118 2.34171 2.95118 2.14645 3.14645C1.95118 3.34171 1.95118 3.65829 2.14645 3.85355L5.79289 7.5L2.14645 11.1464ZM8.14645 11.1464C7.95118 11.3417 7.95118 11.6583 8.14645 11.8536C8.34171 12.0488 8.65829 12.0488 8.85355 11.8536L12.8536 7.85355C13.0488 7.65829 13.0488 7.34171 12.8536 7.14645L8.85355 3.14645C8.65829 2.95118 8.34171 2.95118 8.14645 3.14645C7.95118 3.34171 7.95118 3.65829 8.14645 3.85355L11.7929 7.5L8.14645 11.1464Z"
                      fill="var(--secondary)"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
                <span className="sr-only">Expand sidebar</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-start items-center p-1 gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                className="hover:bg-transparent float-right cursor-pointer hover:text-primary h-4 w-4"
              >
                <div>
                  <svg
                    width="20"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="#e5e5e5"
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.85355 3.85355C7.04882 3.65829 7.04882 3.34171 6.85355 3.14645C6.65829 2.95118 6.34171 2.95118 6.14645 3.14645L2.14645 7.14645C1.95118 7.34171 1.95118 7.65829 2.14645 7.85355L6.14645 11.8536C6.34171 12.0488 6.65829 12.0488 6.85355 11.8536C7.04882 11.6583 7.04882 11.3417 6.85355 11.1464L3.20711 7.5L6.85355 3.85355ZM12.8536 3.85355C13.0488 3.65829 13.0488 3.34171 12.8536 3.14645C12.6583 2.95118 12.3417 2.95118 12.1464 3.14645L8.14645 7.14645C7.95118 7.34171 7.95118 7.65829 8.14645 7.85355L12.1464 11.8536C12.3417 12.0488 12.6583 12.0488 12.8536 11.8536C13.0488 11.6583 13.0488 11.3417 12.8536 11.1464L9.20711 7.5L12.8536 3.85355Z"
                      fill="var(--secondary)"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
                <span className="sr-only">Collapse sidebar</span>
              </Button>
              <ThemeToggle />
              <Link
                href="https://join.slack.com/t/indexmaker/shared_invite/zt-3bjud4ge8-RSubr2u~zSNZzQYtd1RrDA"
                target="_blank"
                className="inline-block hover:text-primary"
              >
                <Slack className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
  external?: boolean;
  collapsed?: boolean;
  className?: string;
  iconClassName?: string;
}

function NavItem({
  href,
  icon: Icon,
  children,
  active,
  external,
  collapsed,
  className,
  iconClassName,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-sm py-[6px] font-[500] transition-colors ",
        collapsed ? "justify-center px-0" : "px-[10px]",
        className,
        active
          ? "bg-foreground hover:bg-accent text-primary"
          : " hover:bg-accent hover:text-muted"
      )}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <Icon
        className={`h-4 w-4 ${active ? `text-[#2470ff]` : ``} ${
          iconClassName || ""
        }`}
      />
      {!collapsed && (
        <>
          <span className="">{children}</span>
          {external && (
            <RightArrow
              className="ml-auto rotate-135 p-[2px]"
              width="17px"
              height="17px"
            />
          )}
        </>
      )}
    </Link>
  );
}
