import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const outPath = path.join(process.cwd(), "src", "lib", "embedded-db.ts");

if (fs.existsSync(dbPath)) {
  const buf = fs.readFileSync(dbPath);
  const b64 = buf.toString("base64");
  const content = `// Auto-generated fallback for serverless environments (e.g. Vercel)\nexport const EMBEDDED_DB_BASE64 = "${b64}";\n`;
  fs.writeFileSync(outPath, content, "utf-8");
  console.log(`✅ Embedded database written to ${outPath} (${buf.length} bytes, base64 length: ${b64.length})`);
} else {
  console.error("prisma/dev.db not found!");
  process.exit(1);
}
