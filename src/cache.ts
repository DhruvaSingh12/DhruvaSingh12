import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CacheEntry } from './types.js';

const CACHE_DIR = 'cache';

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

function hashString(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function cacheFilename(username: string): string {
  return join(CACHE_DIR, `${hashString(username)}.txt`);
}

// Read the cache file; returns empty array if it doesn't exist.
export function readCache(username: string): CacheEntry[] {
  ensureCacheDir();
  const file = cacheFilename(username);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf-8').split('\n').filter(Boolean);
  return lines.map((line) => {
    const [repoHash, commitCount, myCommits, additions, deletions] = line.split(' ');
    return {
      repoHash,
      commitCount: parseInt(commitCount, 10),
      myCommits: parseInt(myCommits, 10),
      additions: parseInt(additions, 10),
      deletions: parseInt(deletions, 10),
    };
  });
}

// Write cache entries back to disk.
export function writeCache(username: string, entries: CacheEntry[]): void {
  ensureCacheDir();
  const file = cacheFilename(username);
  const content = entries
    .map((e) => `${e.repoHash} ${e.commitCount} ${e.myCommits} ${e.additions} ${e.deletions}`)
    .join('\n');
  writeFileSync(file, content + '\n', 'utf-8');
}

// Generate the hash for a repo's nameWithOwner.
export function repoHash(nameWithOwner: string): string {
  return hashString(nameWithOwner);
}
