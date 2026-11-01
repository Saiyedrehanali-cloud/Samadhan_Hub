import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { EMBEDDED_DB_BASE64 } from "./embedded-db";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith("file:")) {
    return envUrl;
  }

  // Running on Vercel or AWS Lambda serverless environment
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join("/tmp", "dev.db");

    if (!fs.existsSync(tmpDbPath)) {
      // 1. Try copying from known candidate paths on disk
      const candidates = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), "dev.db"),
        path.resolve(process.cwd(), ".next", "server", "prisma", "dev.db"),
        path.join(__dirname, "dev.db"),
        path.join(__dirname, "..", "prisma", "dev.db"),
      ];

      let copied = false;
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            copied = true;
            break;
          } catch (e) {
            console.error("Failed to copy dev.db candidate:", e);
          }
        }
      }

      // 2. If no file found on disk, materialize from embedded base64 store
      if (!copied && EMBEDDED_DB_BASE64) {
        try {
          const buf = Buffer.from(EMBEDDED_DB_BASE64, "base64");
          fs.writeFileSync(tmpDbPath, buf);
          console.log("✅ Materialized dev.db in /tmp from embedded store.");
        } catch (e) {
          console.error("Failed to write embedded dev.db to /tmp:", e);
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      return `file:${tmpDbPath}`;
    }
  }

  return envUrl || "file:./dev.db";
}

const dbUrl = resolveDatabaseUrl();

export const db =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
