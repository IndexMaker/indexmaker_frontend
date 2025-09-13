import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CollateralLot, Position } from "@/types";

const toNum = (v: number | string | undefined | null) =>
  v == null || v === "" ? 0 : typeof v === "number" ? v : parseFloat(v);

const fmt7 = (v: number | string | undefined | null) => toNum(v).toFixed(7);

const fmtDate = (ts: number) => {
  const ms = ts < 2_000_000_000 ? ts * 1000 : ts;
  return new Date(ms).toLocaleString();
};

function BalanceRow({
  title,
  dr,
  cr,
}: {
  title: string;
  dr: number | string;
  cr: number | string;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pl-2" />
      <td className="py-2 pl-2 text-sm text-muted-foreground">{title}</td>
      <td className="py-2 pr-2 text-right  text-sm tabular-nums border-l">
        {fmt7(dr)}
      </td>
      <td className="py-2 pr-2 text-right  text-sm tabular-nums">
        {fmt7(cr)}
      </td>
    </tr>
  );
}

// Expandable lot row + its spend rows
function LotRows({
  lot,
  isCR,
  expanded,
  onToggle,
}: {
  lot: CollateralLot;
  isCR: boolean; // true => show numbers in CR columns; false => DR columns
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Summary row */}
      <tr className="hover:bg-accent/40 transition-colors">
        <td className="pl-1">
          <button
            type="button"
            className="inline-flex items-center rounded p-1 hover:bg-accent"
            onClick={onToggle}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="py-2 text-sm">{fmtDate(lot.created_timestamp)}</td>
        <td className="py-2 text-xs  break-all">{lot.payment_id}</td>
        <td className="py-2 border-l" />
        {/* DR side visible when isCR === false */}
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            !isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {!isCR ? fmt7(lot.unconfirmed_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            !isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {!isCR ? fmt7(lot.ready_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            !isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {!isCR ? fmt7(lot.preauth_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums border-l",
            !isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {!isCR ? fmt7(lot.spent_amount) : ""}
        </td>
        {/* CR side visible when isCR === true */}
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {isCR ? fmt7(lot.unconfirmed_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {isCR ? fmt7(lot.ready_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {isCR ? fmt7(lot.preauth_amount) : ""}
        </td>
        <td
          className={cn(
            "py-2 pr-2 text-right  text-sm tabular-nums",
            isCR ? "" : "text-muted-foreground"
          )}
        >
          {" "}
          {isCR ? fmt7(lot.spent_amount) : ""}
        </td>
      </tr>

      {/* Spend rows */}
      {expanded &&
        lot.spends?.map((spend) => (
          <tr key={spend.payment_id + spend.timestamp} className="bg-accent">
            <td />
            <td className="py-2 text-sm">{fmtDate(spend.timestamp)}</td>
            <td className="py-2 text-xs  break-all">
              {spend.payment_id}
            </td>
            <td className="py-2 border-l text-xs  break-all">
              {spend.client_order_id}
            </td>
            {/* DR spend columns (visible when isCR === false) */}
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {!isCR ? "" : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {!isCR ? "" : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {!isCR ? fmt7(spend.preauth_amount) : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums border-l">
              {!isCR ? fmt7(spend.spent_amount) : ""}
            </td>
            {/* CR spend columns (visible when isCR === true) */}
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {isCR ? fmt7(spend.preauth_amount) : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {isCR ? fmt7(spend.spent_amount) : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {isCR ? "" : ""}
            </td>
            <td className="py-2 pr-2 text-right  text-sm tabular-nums">
              {isCR ? "" : ""}
            </td>
          </tr>
        ))}
    </>
  );
}

// Table section header
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export function CollateralPositionSection({
  position,
}: {
  position?: Position | null;
}) {
  if (!position) {
    return (
      <Card className="bg-foreground">
        <CardHeader>
          <CardTitle>Collateral Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No collateral data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { side_dr, side_cr } = position;
  
  const drLots = [
    ...(side_dr?.open_lots ?? []),
    ...(side_dr?.closed_lots ?? []),
  ];
  const crLots = [
    ...(side_cr?.open_lots ?? []),
    ...(side_cr?.closed_lots ?? []),
  ];

  // Local state for expanded lots
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Card className="divide-y bg-foreground p-2 gap-2">
      <div className="p-2">
        <SectionHeading>Collateral Position</SectionHeading>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Chain ID:</span>{" "}
            <span className="">{String(position.chain_id)}</span>
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Address:</span>{" "}
            <span className=" break-all">{position.address}</span>
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="p-2">
        <SectionHeading>Balances</SectionHeading>
        <div className="overflow-x-auto mt-2 rounded-lg border">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "35%" }} />
            </colgroup>
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wide">
                <th className="text-left p-2"></th>
                <th className="text-left p-2">Balance</th>
                <th className="text-right p-2 border-l">Debit (DR)</th>
                <th className="text-right p-2">Credit (CR)</th>
              </tr>
            </thead>
            <tbody>
              <BalanceRow
                title="Unconfirmed"
                dr={side_dr.unconfirmed_balance}
                cr={side_cr.unconfirmed_balance}
              />
              <BalanceRow
                title="Ready"
                dr={side_dr.ready_balance}
                cr={side_cr.ready_balance}
              />
              <BalanceRow
                title="Preauth"
                dr={side_dr.preauth_balance}
                cr={side_cr.preauth_balance}
              />
              <BalanceRow
                title="Spent"
                dr={side_dr.spent_balance}
                cr={side_cr.spent_balance}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Lots & Spends */}
      <div className="p-2">
        <SectionHeading>Transactions</SectionHeading>
        <div className="overflow-x-auto mt-2 rounded-lg border">
          <table className="w-full text-sm" id="collateral-lots-table">
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
            </colgroup>
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wide">
                <th className="text-left p-2"></th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Payment ID</th>
                <th className="text-left p-2 border-l">Order ID</th>
                <th className="text-right p-2">Unconfirmed</th>
                <th className="text-right p-2">Ready</th>
                <th className="text-right p-2">Preauth</th>
                <th className="text-right p-2 border-l">Spent</th>
                <th className="text-right p-2">Unconfirmed</th>
                <th className="text-right p-2">Ready</th>
                <th className="text-right p-2">Preauth</th>
                <th className="text-right p-2">Spent</th>
              </tr>
            </thead>
            <tbody>
              {/* CR lots first (right side) */}
              {crLots.map((lot) => (
                <LotRows
                  key={`cr-${lot.payment_id}`}
                  lot={lot}
                  isCR
                  expanded={!!expanded[`cr-${lot.payment_id}`]}
                  onToggle={() => toggle(`cr-${lot.payment_id}`)}
                />
              ))}

              {/* DR lots next (left side) */}
              {drLots.map((lot) => (
                <LotRows
                  key={`dr-${lot.payment_id}`}
                  lot={lot}
                  isCR={false}
                  expanded={!!expanded[`dr-${lot.payment_id}`]}
                  onToggle={() => toggle(`dr-${lot.payment_id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
