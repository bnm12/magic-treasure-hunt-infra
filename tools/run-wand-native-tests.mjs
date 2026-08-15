import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compiler = path.join(
  root,
  "node_modules",
  "@zigc",
  `${process.platform}-${process.arch}`,
  "bin",
  process.platform === "win32" ? "zig.exe" : "zig",
);
const buildDirectory = path.join(root, "arduino", "esp32", "native", ".build");
const outputPath = path.join(
  buildDirectory,
  process.platform === "win32" ? "wand_codec_test.exe" : "wand_codec_test",
);

const sources = [
  path.join(root, "arduino", "esp32", "WandNdefCodec.cpp"),
  path.join(root, "arduino", "esp32", "native", "wand_codec_test.cpp"),
];

if (!fs.existsSync(compiler)) {
  throw new Error(
    "Native codec compiler is missing. Run `npm install` from the repository root first.",
  );
}

fs.mkdirSync(buildDirectory, { recursive: true });

try {
  const compile = spawnSync(
    compiler,
    [
      "c++",
      "-std=c++17",
      "-Wall",
      "-Wextra",
      "-Werror",
      "-pedantic",
      "-Wno-nullability-completeness",
      ...sources,
      "-o",
      outputPath,
    ],
    {
      cwd: root,
      stdio: "inherit",
    },
  );

  if (compile.error) throw compile.error;
  if (compile.status !== 0) {
    process.exit(compile.status ?? 1);
  }

  const run = spawnSync(outputPath, [], {
    cwd: root,
    stdio: "inherit",
  });

  if (run.error) throw run.error;
  process.exit(run.status ?? 1);
} finally {
  fs.rmSync(outputPath, { force: true });
}
