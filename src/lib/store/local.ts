import { promises as fs } from "node:fs";
import path from "node:path";
import type { CollectionName } from "@/lib/types";

export interface Repository {
  readonly mode: "local" | "supabase";
  list<T>(collection: CollectionName, predicate?: (row: T) => boolean): Promise<T[]>;
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  insert<T extends { id: string }>(collection: CollectionName, value: T): Promise<T>;
  update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    patch: Partial<T>,
  ): Promise<T | null>;
  remove(collection: CollectionName, id: string): Promise<void>;
}

type StoreFile = {
  version: 1;
  updatedAt: string;
  collections: Record<string, Array<Record<string, unknown>>>;
};

const EMPTY_COLLECTIONS: Record<string, Array<Record<string, unknown>>> = {
  users: [],
  invitations: [],
  sources: [],
  reports: [],
  events: [],
  notifications: [],
  settings: [],
  pushSubscriptions: [],
  auditLogs: [],
  ingestionRuns: [],
  analysisRuns: [],
};

export function dataDir(): string {
  const configured = process.env.LOCAL_DATA_DIR?.trim();
  return configured && configured.length > 0 ? configured : path.join(process.cwd(), ".data");
}

function storePath(): string {
  return path.join(dataDir(), "store.json");
}

type Cache = {
  data: StoreFile | null;
  mtimeMs: number;
  writeChain: Promise<void>;
};

const globalForStore = globalThis as unknown as { __radarStore?: Cache };

function cache(): Cache {
  globalForStore.__radarStore ??= { data: null, mtimeMs: 0, writeChain: Promise.resolve() };
  return globalForStore.__radarStore;
}

async function load(): Promise<StoreFile> {
  const c = cache();
  const file = storePath();
  try {
    const stat = await fs.stat(file);
    if (c.data && c.mtimeMs === stat.mtimeMs) return c.data;
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    const collections = { ...EMPTY_COLLECTIONS, ...(parsed.collections ?? {}) };
    c.data = { version: 1, updatedAt: parsed.updatedAt ?? new Date().toISOString(), collections };
    c.mtimeMs = stat.mtimeMs;
    return c.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const fresh: StoreFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      collections: structuredClone(EMPTY_COLLECTIONS),
    };
    c.data = fresh;
    return fresh;
  }
}

async function persist(data: StoreFile): Promise<void> {
  const c = cache();
  data.updatedAt = new Date().toISOString();
  c.data = data;
  c.writeChain = c.writeChain.then(async () => {
    const dir = dataDir();
    await fs.mkdir(dir, { recursive: true });
    const target = storePath();
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await fs.rename(tmp, target);
    try {
      const stat = await fs.stat(target);
      c.mtimeMs = stat.mtimeMs;
    } catch {
      /* mtime refresh is best-effort */
    }
  });
  await c.writeChain;
}

/**
 * File-backed repository used for local development and explicitly-labelled
 * demo mode. Not intended for multi-instance production deployment; use the
 * Supabase adapter (Postgres + RLS) for that. Documented in README.
 */
export class LocalRepository implements Repository {
  readonly mode = "local" as const;

  async list<T>(collection: CollectionName, predicate?: (row: T) => boolean): Promise<T[]> {
    const data = await load();
    const rows = (data.collections[collection] ?? []) as unknown as T[];
    return predicate ? rows.filter(predicate) : [...rows];
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    const rows = await this.list<{ id: string }>(collection);
    return (rows.find((row) => row.id === id) as T | undefined) ?? null;
  }

  async insert<T extends { id: string }>(collection: CollectionName, value: T): Promise<T> {
    const data = await load();
    const rows = data.collections[collection] ?? [];
    if (rows.some((row) => row.id === value.id)) {
      throw new Error(`Duplicate id ${value.id} in ${collection}`);
    }
    rows.push(value as unknown as Record<string, unknown>);
    data.collections[collection] = rows;
    await persist(data);
    return value;
  }

  async update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    patch: Partial<T>,
  ): Promise<T | null> {
    const data = await load();
    const rows = data.collections[collection] ?? [];
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const next = { ...rows[index], ...patch } as Record<string, unknown>;
    rows[index] = next;
    data.collections[collection] = rows;
    await persist(data);
    return next as unknown as T;
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const data = await load();
    const rows = data.collections[collection] ?? [];
    data.collections[collection] = rows.filter((row) => row.id !== id);
    await persist(data);
  }
}

/** Testing helper: wipe the in-memory cache (does not delete the file). */
export function resetLocalStoreCache(): void {
  cache().data = null;
  cache().mtimeMs = 0;
}
