// Shared read/write for LP position tracker.
// File: ~/.openclaw/workspace/memory/lp-positions.json
//
// Positions are "active" (withdrawnAt === null) or "withdrawn" (withdrawnAt is a date string).
// No status field — inferred from withdrawnAt.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

const LP_FILE = join(homedir(), ".openclaw", "workspace", "memory", "lp-positions.json");

export function getLpFilePath() {
  return LP_FILE;
}

export function readLpPositions() {
  try {
    return JSON.parse(readFileSync(LP_FILE, "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT") return { positions: [] };
    throw err;
  }
}

export function writeLpPositions(data) {
  mkdirSync(dirname(LP_FILE), { recursive: true });
  writeFileSync(LP_FILE, JSON.stringify(data, null, 2) + "\n");
}

export function addLpPosition(entry) {
  const data = readLpPositions();
  data.positions.push(entry);
  writeLpPositions(data);
  return data;
}

export function markWithdrawn(tokenId, chain) {
  const data = readLpPositions();
  const pos = data.positions.find(
    (p) => p.tokenId === String(tokenId) && p.chain === chain && p.withdrawnAt === null
  );
  if (pos) {
    pos.withdrawnAt = new Date().toISOString();
    writeLpPositions(data);
  }
  return { found: !!pos, data };
}
