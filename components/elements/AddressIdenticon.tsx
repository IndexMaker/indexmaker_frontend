"use client";

/**
 * AddressIdenticon - Generates a deterministic colored identicon from an Ethereum address.
 * Uses a simple grid-based approach (similar to GitHub identicons / Ethereum blockies).
 */

import { useMemo } from "react";

interface AddressIdenticonProps {
  address: string;
  size?: number;
  className?: string;
}

/**
 * Simple hash function for address string -> deterministic seed
 */
function hashCode(str: string): number {
  let hash = 0;
  const s = str.toLowerCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate HSL color from seed
 */
function seedToColor(seed: number, offset: number): string {
  const hue = ((seed + offset * 137) % 360);
  const sat = 50 + (seed % 30);
  const light = 40 + ((seed + offset) % 25);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

/**
 * Generate a 5x5 symmetrical grid pattern from address
 */
function generatePattern(address: string): { grid: boolean[][]; color: string; bgColor: string } {
  const seed = hashCode(address);
  const color = seedToColor(seed, 0);
  const bgColor = seedToColor(seed, 7);

  // 5x5 grid, but only need to generate left half (3 cols) due to symmetry
  const grid: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    grid[row] = [];
    for (let col = 0; col < 3; col++) {
      // Use different bytes of the address for each cell
      const idx = (row * 3 + col) * 2 + 2; // skip 0x prefix
      const charCode = idx < address.length ? address.charCodeAt(idx) : seed + row + col;
      grid[row][col] = charCode % 2 === 0;
    }
    // Mirror: col 3 = col 1, col 4 = col 0
    grid[row][3] = grid[row][1];
    grid[row][4] = grid[row][0];
  }

  return { grid, color, bgColor };
}

export function AddressIdenticon({ address, size = 16, className = "" }: AddressIdenticonProps) {
  const { grid, color, bgColor } = useMemo(() => generatePattern(address), [address]);

  const cellSize = size / 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`rounded-sm ${className}`}
      style={{ flexShrink: 0 }}
    >
      <rect width={size} height={size} fill={bgColor} />
      {grid.map((row, ri) =>
        row.map((cell, ci) =>
          cell ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * cellSize}
              y={ri * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default AddressIdenticon;
