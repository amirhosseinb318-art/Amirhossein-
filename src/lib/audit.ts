import { getRepo } from "@/lib/store";
import type { AuditAction, AuditLogRecord } from "@/lib/types";
import { newId } from "@/lib/crypto";

export async function writeAudit(input: {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  summary: string;
  meta?: AuditLogRecord["meta"];
}): Promise<void> {
  const repo = await getRepo();
  await repo.insert<AuditLogRecord>("auditLogs", {
    id: newId("aud"),
    at: new Date().toISOString(),
    ...input,
  });
}
