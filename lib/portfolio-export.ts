/**
 * Portfolio Export Utility
 *
 * Provides CSV export functionality for portfolio data.
 * Uses browser download API (no server-side).
 *
 * @see Story 6.12 - Task 6 (AC #7)
 */

import type { PortfolioPosition } from '@/types/portfolio';

/**
 * CSV column headers
 */
const CSV_HEADERS = [
  'Symbol',
  'Name',
  'Arbitrum Balance',
  'Orbit Balance',
  'Total Balance',
  'Current Price (USD)',
  'Value (USD)',
  'Export Date',
];

/**
 * Format a number to fixed decimal places
 */
function formatNumber(value: number, decimals: number = 4): string {
  return value.toFixed(decimals);
}

/**
 * Escape a CSV field value
 * Wraps in quotes if contains comma, newline, or quote
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a portfolio position as a CSV row
 */
function formatPositionRow(position: PortfolioPosition, exportDate: string): string {
  const fields = [
    position.symbol,
    position.name,
    position.arbitrumFormatted,
    position.orbitFormatted,
    position.totalFormatted,
    formatNumber(position.currentPrice),
    formatNumber(position.value, 2),
    exportDate,
  ];

  return fields.map(escapeCSVField).join(',');
}

/**
 * Generate CSV content from portfolio positions
 */
export function generatePortfolioCSV(positions: PortfolioPosition[]): string {
  const exportDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const header = CSV_HEADERS.join(',');
  const rows = positions.map((p) => formatPositionRow(p, exportDate));

  return [header, ...rows].join('\n');
}

/**
 * Download portfolio as CSV file
 *
 * @param positions - Array of portfolio positions to export
 * @param filename - Optional custom filename (default: portfolio-{date}.csv)
 *
 * @example
 * ```ts
 * import { downloadPortfolioCSV } from '@/lib/portfolio-export';
 *
 * function PortfolioPage() {
 *   const { positions } = usePortfolio();
 *
 *   return (
 *     <button onClick={() => downloadPortfolioCSV(positions)}>
 *       Export CSV
 *     </button>
 *   );
 * }
 * ```
 */
export function downloadPortfolioCSV(
  positions: PortfolioPosition[],
  filename?: string
): void {
  if (positions.length === 0) {
    console.warn('No positions to export');
    return;
  }

  const csv = generatePortfolioCSV(positions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Generate default filename with date
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `portfolio-${date}.csv`;

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Hook-friendly export function that returns a callback
 */
export function createExportHandler(positions: PortfolioPosition[]) {
  return () => downloadPortfolioCSV(positions);
}
