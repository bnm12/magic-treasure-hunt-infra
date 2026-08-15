import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(
  process.argv[2] ?? path.join(root, "website/src/utils/test-fixtures/wand-ledger-codec.json"),
);
const outputPath = path.resolve(
  process.argv[3] ??
    path.join(root, "arduino/esp32/native/generated/wand_fixtures.h"),
);

const fixture = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function bytesForRecord(record) {
  if (record.recordType === "mime") {
    return { tnf: 0x02, type: Buffer.from(record.mediaType ?? ""), id: [] };
  }
  if (record.recordType === "url") {
    return { tnf: 0x01, type: Buffer.from("U"), id: [] };
  }
  return { tnf: 0x02, type: Buffer.from(record.recordType), id: [] };
}

function encodeMessage(records) {
  const encoded = [];
  records.forEach((record, index) => {
    const logical = bytesForRecord(record);
    const payload = Buffer.from(record.data ?? []);
    const short = payload.length <= 0xff;
    let flags = logical.tnf | (index === 0 ? 0x80 : 0) |
      (index + 1 === records.length ? 0x40 : 0);
    if (short) flags |= 0x10;
    encoded.push(flags, logical.type.length);
    if (short) {
      encoded.push(payload.length);
    } else {
      encoded.push(
        (payload.length >>> 24) & 0xff,
        (payload.length >>> 16) & 0xff,
        (payload.length >>> 8) & 0xff,
        payload.length & 0xff,
      );
    }
    encoded.push(...logical.type, ...logical.id, ...payload);
  });
  return encoded;
}

function identifier(name) {
  return name.replace(/[^A-Za-z0-9]+/g, "_");
}

const lines = [
  "#ifndef WAND_FIXTURES_H",
  "#define WAND_FIXTURES_H",
  "",
  "#include <stddef.h>",
  "#include <stdint.h>",
  "",
  "namespace WandFixtures {",
  "struct Fixture { const uint8_t* data; size_t length; };",
  "",
];

const entries = [];
for (const [name, value] of Object.entries(fixture)) {
  if (!Array.isArray(value.records)) continue;
  const id = identifier(name);
  const bytes = encodeMessage(value.records);
  lines.push(`inline constexpr uint8_t ${id}[] = {`);
  for (let index = 0; index < bytes.length; index += 16) {
    lines.push(`  ${bytes.slice(index, index + 16).join(", ")},`);
  }
  lines.push("};");
  lines.push(`inline constexpr Fixture ${id}Fixture{${id}, sizeof(${id})};`);
  lines.push("");
  entries.push(`  ${id}Fixture,`);
}

lines.push("inline constexpr Fixture all[] = {", ...entries, "};", "");
lines.push("}  // namespace WandFixtures", "", "#endif", "");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"));
console.log(`Generated ${outputPath} from ${inputPath}`);
