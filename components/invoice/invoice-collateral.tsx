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

const renderVal = (v: number | string | undefined | null) =>
  v == null || v === "" || v === 0 ? "" : fmt7(v);

// --- helpers ---------------------------------------------------------

const sumLotAll = (lot?: Partial<CollateralLot>) =>
  toNum(lot?.unconfirmed_amount) +
  toNum(lot?.ready_amount) +
  toNum(lot?.preauth_amount) +
  toNum(lot?.spent_amount);

const sumSpendAll = (spend?: {
  ready_amount?: number | string;
  preauth_amount?: number | string;
  spent_amount?: number | string;
}) =>
  toNum(spend?.ready_amount) +
  toNum(spend?.preauth_amount) +
  toNum(spend?.spent_amount);

const sumDeposit = (side?: {
  unconfirmed_balance?: number | string;
  ready_balance?: number | string;
  preauth_balance?: number | string;
}) =>
  toNum(side?.unconfirmed_balance) +
  toNum(side?.ready_balance) +
  toNum(side?.preauth_balance);

// Try common field names for seq and tx hash so we work with your API shape.
const getDepositSeq = (lot: any): string | undefined =>
  [lot?.seq_num, lot?.seqNum, lot?.sequence, lot?.sequence_number, lot?.deposit_seq, lot?.deposit_id]
    .find((v: any) => v !== undefined && v !== null)
    ?.toString();

const getDepositTxHash = (lot: any): string | undefined =>
  [
    lot?.deposit_tx_hash,
    lot?.tx_hash,
    lot?.deposit_tx,
    lot?.txHash,
    lot?.transaction_hash,
  ].find((v: any) => v) as string | undefined;

const basescanBase = (chainId?: number) =>
  chainId === 84532 ? "https://sepolia.basescan.org" : "https://basescan.org";

function BalanceRow({
  title,
  isInner,
  dr,
  cr,
}: {
  title: string;
  isInner?: boolean | null;
  dr?: number | string | null;
  cr?: number | string | null;
}) {
  return (cr !== 0 || dr !== 0) && (
    <tr className={isInner ? "border-b last:border-b-0 bg-accent" : "border-b last:border-b-0"}>
      <td className="py-2 pl-2" />
      <td className="py-2 pl-2 text-sm text-muted-foreground">{title}</td>
      <td className="py-2 pr-2 text-right text-sm tabular-nums">
        {renderVal(dr)}
      </td>
      <td className="py-2 pr-2 text-right text-sm tabular-nums border-l" width="6em">
        {renderVal(cr)}
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
  chainId,
}: {
  lot: CollateralLot;
  isCR: boolean; // true => this is a CR-side lot
  expanded: boolean;
  onToggle: () => void;
  chainId?: number;
}) {
  const lotSum = sumLotAll(lot);
  const depositSeq = getDepositSeq(lot);
  const depositTxHash = getDepositTxHash(lot);
  const explorer = basescanBase(chainId);
  const depositHref = depositTxHash
    ? `${explorer}/tx/${depositTxHash}`
    : depositSeq
      ? `${explorer}/search?f=0&q=${encodeURIComponent(depositSeq)}`
      : undefined;

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
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="py-2 text-sm">{fmtDate(lot.created_timestamp)}</td>

        {/* NEW: Deposit ID (Seq Num) w/ BaseScan link */}
        <td className="py-2 text-xs break-all">
          {depositSeq ? (
            depositHref ? (
              <a
                href={depositHref}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
                title="View on BaseScan"
              >
                Deposit ({depositSeq})
              </a>
            ) : (
              "Deposit (" + depositSeq + ")"
            )
          ) : (
            lot.payment_id
          )}
        </td>

        <td className="py-2 text-xs break-all">{/* Order ID in spends */}</td>

        {/* DR (sum of all DR states) */}
        <td
          className={cn(
            "py-2 pr-2 text-right text-sm tabular-nums",
            !isCR ? "" : "text-muted-foreground"
          )}
        >
          {!isCR ? fmt7(lotSum) : ""}
        </td>

        {/* Vertical line should separate DR | CR, and we should avoid other vertical lines */}

        {/* CR (sum of all CR states) */}
        <td
          className={cn(
            "py-2 pr-2 border-l text-right text-sm tabular-nums",
            isCR ? "" : "text-muted-foreground"
          )}
        >
          {isCR ? fmt7(lotSum) : ""}
        </td>
      </tr>

      {/* Spend rows */}
      {expanded &&
        lot.spends?.map((spend) => {
          const spendSum = sumSpendAll(spend);
          return (
            <tr key={spend.payment_id + spend.timestamp} className="bg-accent">
              <td />
              <td className="py-2 text-sm">{fmtDate(spend.timestamp)}</td>
              <td className="py-2 text-xs break-all">{spend.payment_id}</td>
              <td className="py-2 text-xs break-all">{spend.client_order_id}</td>

              {/* DR spend sum (All spends must use opposite side) */}
              <td className="py-2 pr-2 text-right text-sm tabular-nums">
                {isCR ? fmt7(spendSum) : ""}
              </td>

              {/* Vertical line should separate DR | CR, and we should avoid other vertical lines */}

              {/* CR spend sum  (All spends must use opposite side) */}
              <td className="py-2 pr-2 border-l text-right text-sm tabular-nums">
                {!isCR ? fmt7(spendSum) : ""}
              </td>
            </tr>
          );
        })}
    </>
  );
}

// Table section header
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">{children}</h3>;
}

export function CollateralPositionSection({ position }: { position?: Position | null }) {
  if (!position) {
    return (
      <Card className="bg-foreground">
        <CardHeader>
          <CardTitle>Collateral Position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No collateral data available.</p>
        </CardContent>
      </Card>
    );
  }

  const { side_dr, side_cr } = position;

  const drLots = [...(side_dr?.open_lots ?? []), ...(side_dr?.closed_lots ?? [])];
  const crLots = [...(side_cr?.open_lots ?? []), ...(side_cr?.closed_lots ?? [])];


  // Amount deposited and actually paid -> You deposit (CR) to pay (DR)
  const totalDepositCR = sumDeposit(side_cr);
  const totalPaidCR = crLots.reduce((acc, lot) => acc + toNum(lot.spent_amount), 0) || 0;

  // Amount requested and actually withdrawn -> You request (DR) to draw (CR)
  const totalRequestDR = sumDeposit(side_dr);
  const totalDrawDR = drLots.reduce((acc, lot) => acc + toNum(lot.spent_amount), 0) || 0;

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

      {/* Balances (upper) ------------------------------------------------ */}
      <div className="p-2">
        <SectionHeading>Balances</SectionHeading>
        <div className="overflow-x-auto mt-2 rounded-lg border">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: "60%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wide">
                <th className="text-left p-2"></th>
                <th className="text-left p-2">Balance</th>
                <th className="text-right p-2">Debit (DR)</th>
                <th className="text-right p-2 border-l">Credit (CR)</th>
              </tr>
            </thead>
            <tbody>
              {/* !!! IMPORATANT: The use of opposite side is intentional.
                  Rule of thumb: The sum of all Credits (CR) must match sum of all Debits (DR).
                  These are totals. Say we received $100 deposit (CR) in total, however $90 was already
                  used to pay for mints, i.e. $90 was sent To Mint (DR), and to cover for that we paid (CR).
                  We show Total Paid as CR to balance out To Mint on DR, and to keep correctness we
                  deduct Total Paid $90 from total deposit $100, and remainder of $10 we call Total Unprocessed.
                  Next we need to explain where that remaining $10 is and for that we "transfer" sub-amounts of
                  that To Custody, To Trading, and To Solver. This way our balance sheet is correctly balanced,
                  and all CR less all DR sum up to zero, which is essential. The total-zero-sum is the tool
                  used in accounting to guarantee that some moneys aren't lost somewhere. When we're breaking
                  down, we need to do it in such a way that we obtain total-zero-sum.
              */}
              <BalanceRow title="Total Unprocessed" dr={totalRequestDR} cr={totalDepositCR} />
              <BalanceRow isInner title="To Custody" dr={side_cr.unconfirmed_balance} cr={side_dr.unconfirmed_balance} />
              <BalanceRow isInner title="To Trading" dr={side_cr.ready_balance} cr={side_dr.ready_balance} />
              <BalanceRow isInner title="To Solver" dr={side_cr.preauth_balance} cr={side_dr.preauth_balance} />
              <BalanceRow title="Total Paid" dr={totalDrawDR} cr={totalPaidCR} />
              <BalanceRow isInner title="To Mint" dr={side_cr.spent_balance} cr={side_dr.spent_balance} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Lots & Spends (lower) ------------------------------------------ */}
      <div className="p-2">
        <SectionHeading>Transactions</SectionHeading>
        <div className="overflow-x-auto mt-2 rounded-lg border">
          <table className="w-full text-sm" id="collateral-lots-table">
            <colgroup>
              <col style={{ width: 20 }} />
              <col style={{ width: "20%" }} />  {/* Date */}
              <col style={{ width: "20%" }} />  {/* ID */}
              <col style={{ width: "20%" }} />   {/* Order ID */}
              {/* Numeric columns aligned with top: 35% + 35% */}
              <col style={{ width: "20%" }} />  {/* DR */}
              <col style={{ width: "20%" }} />  {/* CR */}
            </colgroup>
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wide">
                <th className="text-left p-2"></th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Order ID</th>
                <th className="text-right p-2">Debit (DR)</th>
                <th className="text-right p-2 border-l">Credit (CR)</th>
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
                  chainId={position.chain_id as any}
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
                  chainId={position.chain_id as any}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
