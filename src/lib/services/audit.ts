import crypto from "crypto";
import { db } from "@/lib/db";

const AUDIT_KEY = process.env.AUDIT_KEY || "caselens-tamper-evident-hmac-key-sih2026";

function computeHash(
  prevHash: string,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  payload: string | null,
  createdAt: Date
): string {
  const data = `${prevHash}|${actorId || ""}|${action}|${entity}|${entityId}|${payload || ""}|${createdAt.toISOString()}`;
  return crypto.createHmac("sha256", AUDIT_KEY).update(data).digest("hex");
}

/**
 * Appends a tamper-evident audit record using cryptographic HMAC-SHA256 chaining.
 */
export async function logAudit({
  actorId,
  action,
  entity,
  entityId,
  payload,
}: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
}) {
  const lastLog = await db.auditLog.findFirst({
    orderBy: { id: "desc" },
    select: { hash: true },
  });

  const prevHash = lastLog?.hash || "GENESIS_BLOCK_00000000000000000000000000000000";
  const now = new Date();
  const payloadStr = payload ? JSON.stringify(payload) : null;
  const hash = computeHash(prevHash, actorId || null, action, entity, entityId, payloadStr, now);

  return db.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      entity,
      entityId,
      payload: payloadStr,
      prevHash,
      hash,
      createdAt: now,
    },
  });
}

export interface AuditVerificationResult {
  valid: boolean;
  totalBlocks: number;
  genesisHash: string | null;
  latestHash: string | null;
  verifiedAt: string;
  tamperDetails?: {
    blockId: number;
    blockIndex: number;
    reason: "HASH_MISMATCH" | "CHAIN_BROKEN";
    expectedHash?: string;
    actualHash?: string;
    expectedPrevHash?: string;
    actualPrevHash?: string;
  };
}

/**
 * Sequentially recomputes every block hash from the genesis block
 * to verify cryptographic chain integrity and detect database tampering.
 */
export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  const logs = await db.auditLog.findMany({
    orderBy: { id: "asc" },
  });

  const verifiedAt = new Date().toISOString();

  if (logs.length === 0) {
    return {
      valid: true,
      totalBlocks: 0,
      genesisHash: null,
      latestHash: null,
      verifiedAt,
    };
  }

  let prevHash = "GENESIS_BLOCK_00000000000000000000000000000000";

  for (let i = 0; i < logs.length; i++) {
    const block = logs[i];

    // 1. Verify link continuity
    if (block.prevHash !== prevHash) {
      return {
        valid: false,
        totalBlocks: logs.length,
        genesisHash: logs[0].hash,
        latestHash: logs[logs.length - 1].hash,
        verifiedAt,
        tamperDetails: {
          blockId: block.id,
          blockIndex: i,
          reason: "CHAIN_BROKEN",
          expectedPrevHash: prevHash,
          actualPrevHash: block.prevHash,
        },
      };
    }

    // 2. Recompute expected block hash
    const expectedHash = computeHash(
      block.prevHash,
      block.actorId,
      block.action,
      block.entity,
      block.entityId,
      block.payload,
      new Date(block.createdAt)
    );

    if (expectedHash !== block.hash) {
      return {
        valid: false,
        totalBlocks: logs.length,
        genesisHash: logs[0].hash,
        latestHash: logs[logs.length - 1].hash,
        verifiedAt,
        tamperDetails: {
          blockId: block.id,
          blockIndex: i,
          reason: "HASH_MISMATCH",
          expectedHash,
          actualHash: block.hash,
        },
      };
    }

    prevHash = block.hash;
  }

  return {
    valid: true,
    totalBlocks: logs.length,
    genesisHash: logs[0].hash,
    latestHash: logs[logs.length - 1].hash,
    verifiedAt,
  };
}


