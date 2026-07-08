import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const MANIFEST_NAME = "canopi-web-edition-manifest.json";
const DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_FILES = 20_000;
const FORBIDDEN_DUCKDB_WASM_RE = /(?:^|\/)duckdb-.*\.wasm$/i;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(root, "dist");
const staticRoot = resolveStaticRoot(distRoot);
const appRoot = resolve(staticRoot, "app");
const tempRoot = resolve(root, ".tmp", "web-edition");

async function main() {
  const archivePath = process.env.CANOPI_WEB_EDITION_ARCHIVE;
  const required = process.env.CANOPI_WEB_EDITION_REQUIRED !== "0"
    && process.env.CANOPI_WEB_EDITION_REQUIRED !== "false";

  if (!archivePath) {
    if (!required) {
      console.log("Skipping Web Edition install; CANOPI_WEB_EDITION_ARCHIVE is not set.");
      return;
    }
    throw new Error("CANOPI_WEB_EDITION_ARCHIVE is required to install the Web Edition artifact.");
  }

  if (!existsSync(distRoot)) {
    throw new Error("Missing dist/. Run npm run build before installing the Web Edition artifact.");
  }

  const extractRoot = resolve(tempRoot, `extract-${process.pid}`);
  rmSync(extractRoot, { recursive: true, force: true });
  mkdirSync(extractRoot, { recursive: true });

  try {
    extractTarGz(resolve(archivePath), extractRoot);
    const manifest = readManifest(extractRoot);
    verifyArtifact(extractRoot, manifest);
    rmSync(appRoot, { recursive: true, force: true });
    copyTree(extractRoot, appRoot);
  } finally {
    rmSync(extractRoot, { recursive: true, force: true });
  }

  if (!existsSync(resolve(appRoot, "index.html"))) {
    const installedIndex = portable(relative(root, resolve(appRoot, "index.html")));
    throw new Error(`Installed Web Edition is missing ${installedIndex}.`);
  }
  console.log(`Installed Canopi Web Edition at ${relative(root, appRoot).split(sep).join("/")}/`);
}

function resolveStaticRoot(distRoot) {
  const clientRoot = resolve(distRoot, "client");
  return existsSync(clientRoot) ? clientRoot : distRoot;
}

function readManifest(extractRoot) {
  const manifestPath = resolve(extractRoot, MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    throw new Error(`Web Edition artifact is missing ${MANIFEST_NAME}.`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.basePath !== "/app/") {
    throw new Error("Web Edition artifact basePath must be /app/.");
  }
  if (
    manifest.spaFallback?.source !== "/app/*" ||
    manifest.spaFallback?.destination !== "/app/index.html" ||
    manifest.spaFallback?.status !== 200
  ) {
    throw new Error("Web Edition artifact has an invalid /app/* SPA fallback contract.");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Web Edition artifact manifest does not list files.");
  }
  return manifest;
}

function verifyArtifact(extractRoot, manifest) {
  const maxAssetBytes = positiveNumber(
    manifest.limits?.cloudflarePagesMaxAssetBytes,
    DEFAULT_MAX_ASSET_BYTES,
  );
  const maxFiles = positiveNumber(
    manifest.limits?.cloudflarePagesMaxFiles,
    DEFAULT_MAX_FILES,
  );
  if (manifest.files.length > maxFiles) {
    throw new Error(`Web Edition artifact contains ${manifest.files.length} files, above limit ${maxFiles}.`);
  }

  const listed = new Set();
  for (const file of manifest.files) {
    verifyManifestFile(extractRoot, file, maxAssetBytes);
    listed.add(file.path);
  }

  if (!listed.has("index.html")) {
    throw new Error("Web Edition artifact manifest must include index.html.");
  }
  verifyCatalogSummary(extractRoot, manifest, listed, maxAssetBytes);
  verifyNoUnexpectedRawWasm(extractRoot);
}

function verifyManifestFile(extractRoot, file, maxAssetBytes) {
  if (
    !file ||
    typeof file.path !== "string" ||
    !Number.isFinite(file.bytes) ||
    typeof file.sha256 !== "string"
  ) {
    throw new Error("Invalid Web Edition artifact file manifest entry.");
  }
  const filePath = safeChildPath(extractRoot, file.path);
  if (!existsSync(filePath)) {
    throw new Error(`Web Edition artifact is missing ${file.path}.`);
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Web Edition artifact entry is not a file: ${file.path}.`);
  }
  if (stat.size > maxAssetBytes) {
    throw new Error(`Web Edition artifact file exceeds ${maxAssetBytes} bytes: ${file.path}.`);
  }
  if (stat.size !== file.bytes) {
    throw new Error(`Web Edition artifact byte count mismatch for ${file.path}.`);
  }
  const sha256 = createHash("sha256").update(readFileSync(filePath)).digest("hex");
  if (sha256 !== file.sha256) {
    throw new Error(`Web Edition artifact checksum mismatch for ${file.path}.`);
  }
  if (FORBIDDEN_DUCKDB_WASM_RE.test(file.path)) {
    throw new Error(`${file.path} must not bundle DuckDB raw WASM.`);
  }
}

function verifyCatalogSummary(extractRoot, manifest, listed, maxAssetBytes) {
  const catalog = manifest.catalog;
  if (!catalog || catalog.manifestPath !== "canopi-catalog/manifest.json") {
    throw new Error("Web Edition artifact manifest is missing catalog manifest metadata.");
  }
  if (catalog.assetFormat !== "parquet") {
    throw new Error("Web Edition catalog artifact must be Parquet-backed.");
  }
  if (!Array.isArray(catalog.supportedFilters) || catalog.supportedFilters.length === 0) {
    throw new Error("Web Edition artifact manifest is missing supported filter metadata.");
  }
  if (!Array.isArray(catalog.files) || catalog.files.length === 0) {
    throw new Error("Web Edition artifact manifest is missing catalog file metadata.");
  }
  for (const filePath of [catalog.manifestPath, ...catalog.files]) {
    if (!listed.has(filePath)) {
      throw new Error(`Web Edition artifact manifest does not include required catalog file ${filePath}.`);
    }
    const stat = statSync(safeChildPath(extractRoot, filePath));
    if (stat.size > maxAssetBytes) {
      throw new Error(`Web Edition catalog file exceeds ${maxAssetBytes} bytes: ${filePath}.`);
    }
  }
}

function verifyNoUnexpectedRawWasm(rootDir) {
  for (const filePath of filesUnder(rootDir)) {
    const relativePath = portable(relative(rootDir, filePath));
    if (FORBIDDEN_DUCKDB_WASM_RE.test(relativePath)) {
      throw new Error(`${relativePath} must not bundle DuckDB raw WASM.`);
    }
  }
}

function extractTarGz(archivePath, targetRoot) {
  if (!existsSync(archivePath)) {
    throw new Error(`Web Edition archive does not exist: ${archivePath}`);
  }
  const data = gunzipSync(readFileSync(archivePath));
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) break;

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;
    const type = String.fromCharCode(header[156] || 48);
    const size = parseInt(readTarString(header, 124, 12).trim() || "0", 8);

    if (type !== "0" && type !== "\0") {
      throw new Error(`Unsupported Web Edition archive entry type for ${path}.`);
    }
    const targetPath = safeChildPath(targetRoot, path);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, data.subarray(offset, offset + size));
    offset += size + tarPadding(size);
  }
}

function readTarString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

function tarPadding(size) {
  const remainder = size % 512;
  return remainder === 0 ? 0 : 512 - remainder;
}

function safeChildPath(rootDir, childPath) {
  if (childPath.startsWith("/") || childPath.split("/").includes("..")) {
    throw new Error(`Unsafe Web Edition artifact path: ${childPath}`);
  }
  const resolved = resolve(rootDir, childPath);
  const rel = relative(rootDir, resolved);
  if (rel === "" || rel.startsWith("..")) {
    throw new Error(`Unsafe Web Edition artifact path: ${childPath}`);
  }
  return resolved;
}

function copyTree(sourceRoot, targetRoot) {
  mkdirSync(targetRoot, { recursive: true });
  for (const filePath of filesUnder(sourceRoot)) {
    const rel = relative(sourceRoot, filePath);
    const targetPath = resolve(targetRoot, rel);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(filePath, targetPath);
  }
}

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
  return files.sort();
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function portable(path) {
  return path.split(sep).join("/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
