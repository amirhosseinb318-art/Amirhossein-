import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionName } from "@/lib/types";
import type { Repository } from "./local";

type Row = { id: string; collection: string; data: Record<string, unknown>; owner_id: string | null };

/**
 * Supabase (Postgres) repository adapter.
 *
 * All rows live in a single `records` table with a JSONB payload, indexed by
 * `collection`. Row-level security policies (see supabase/migrations) deny all
 * direct client writes; this adapter runs server-side with the service-role key
 * and is therefore the only writer. Client code never receives this key.
 *
 * Predicates are evaluated in process. That keeps the adapter engine-agnostic;
 * for very large datasets, promote hot collections to dedicated tables.
 */
export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async fetchAll(collection: CollectionName): Promise<Row[]> {
    const pageSize = 1000;
    const rows: Row[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client
        .from("records")
        .select("id,collection,data,owner_id")
        .eq("collection", collection)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`Supabase read failed for ${collection}: ${error.message}`);
      const batch = (data ?? []) as Row[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows;
  }

  async list<T>(collection: CollectionName, predicate?: (row: T) => boolean): Promise<T[]> {
    const rows = await this.fetchAll(collection);
    const values = rows.map((row) => row.data as unknown as T);
    return predicate ? values.filter(predicate) : values;
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from("records")
      .select("data")
      .eq("collection", collection)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase get failed: ${error.message}`);
    return (data?.data as T | undefined) ?? null;
  }

  async insert<T extends { id: string }>(collection: CollectionName, value: T): Promise<T> {
    const ownerId = collection === "notifications" || collection === "settings" ||
      collection === "pushSubscriptions"
      ? String((value as { userId?: string }).userId ?? "") || null
      : null;
    const { error } = await this.client.from("records").insert({
      id: value.id,
      collection,
      data: value,
      owner_id: ownerId,
    });
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return value;
  }

  async update<T extends { id: string }>(
    collection: CollectionName,
    id: string,
    patch: Partial<T>,
  ): Promise<T | null> {
    const existing = await this.get<T>(collection, id);
    if (!existing) return null;
    const next = { ...existing, ...patch } as T;
    const { error } = await this.client
      .from("records")
      .update({ data: next })
      .eq("collection", collection)
      .eq("id", id);
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return next;
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const { error } = await this.client
      .from("records")
      .delete()
      .eq("collection", collection)
      .eq("id", id);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }
}
