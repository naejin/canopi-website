import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { installWebEdition } from "./install-web-edition.mjs";

test("rejects archive files that are not listed in the artifact manifest", async () => {
  const workspace = createWorkspace();
  try {
    const archivePath = writeArchive(workspace, {
      extraFiles: {
        "extra.txt": "unlisted",
      },
    });

    await assert.rejects(
      () => installWebEdition({ archivePath, rootDir: workspace }),
      /unlisted files.*extra\.txt/i,
    );
    assert.equal(existsSync(resolve(workspace, "dist/app/extra.txt")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("counts the artifact manifest against the Cloudflare file-count limit", async () => {
  const workspace = createWorkspace();
  try {
    const archivePath = writeArchive(workspace, {
      maxFiles: 3,
    });

    await assert.rejects(
      () => installWebEdition({ archivePath, rootDir: workspace }),
      /contains 4 files.*limit 3/i,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("checks the artifact manifest against the Cloudflare per-asset limit", async () => {
  const workspace = createWorkspace();
  try {
    const archivePath = writeArchive(workspace, {
      maxAssetBytes: 128,
    });

    await assert.rejects(
      () => installWebEdition({ archivePath, rootDir: workspace }),
      /canopi-web-edition-manifest\.json exceeds.*128/i,
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("installs a fully listed Web Edition artifact", async () => {
  const workspace = createWorkspace();
  try {
    const archivePath = writeArchive(workspace);

    await installWebEdition({ archivePath, rootDir: workspace });

    assert.equal(readFileSync(resolve(workspace, "dist/app/index.html"), "utf8"), "<!doctype html>");
    assert.equal(
      readFileSync(resolve(workspace, "dist/app/canopi-catalog/species/species-0000.parquet"), "utf8"),
      "species",
    );
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function createWorkspace() {
  const workspace = mkdtempSync(resolve(tmpdir(), "canopi-website-web-edition-"));
  mkdirSync(resolve(workspace, "dist"), { recursive: true });
  return workspace;
}

function writeArchive(
  workspace,
  {
    maxFiles = 20,
    maxAssetBytes = 1024,
    extraFiles = {},
  } = {},
) {
  const files = {
    "index.html": "<!doctype html>",
    "canopi-catalog/manifest.json": "{\"asset_format\":\"parquet\"}",
    "canopi-catalog/species/species-0000.parquet": "species",
  };
  const manifest = {
    basePath: "/app/",
    spaFallback: {
      source: "/app/*",
      destination: "/app/index.html",
      status: 200,
    },
    limits: {
      cloudflarePagesMaxAssetBytes: maxAssetBytes,
      cloudflarePagesMaxFiles: maxFiles,
    },
    catalog: {
      manifestPath: "canopi-catalog/manifest.json",
      assetFormat: "parquet",
      supportedFilters: ["life_cycle"],
      files: ["canopi-catalog/species/species-0000.parquet"],
    },
    files: Object.entries(files).map(([path, content]) => manifestEntry(path, content)),
  };
  const archivePath = resolve(workspace, "artifact.tar.gz");
  writeFileSync(archivePath, createTarGz({
    ...files,
    "canopi-web-edition-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    ...extraFiles,
  }));
  return archivePath;
}

function manifestEntry(path, content) {
  return {
    path,
    bytes: Buffer.byteLength(content),
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

function createTarGz(files) {
  const chunks = [];
  for (const [path, content] of Object.entries(files).sort(([left], [right]) => left.localeCompare(right))) {
    const buffer = Buffer.from(content);
    chunks.push(createTarHeader(path, buffer.byteLength));
    chunks.push(buffer);
    chunks.push(Buffer.alloc(padLength(buffer.byteLength)));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}

function createTarHeader(path, size) {
  const header = Buffer.alloc(512);
  writeString(header, path, 0, 100);
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeOctal(header, checksum, 148, 8);
  return header;
}

function writeString(buffer, value, offset, length) {
  Buffer.from(value).copy(buffer, offset, 0, length);
}

function writeOctal(buffer, value, offset, length) {
  const text = value.toString(8).padStart(length - 1, "0");
  buffer.write(text.slice(-length + 1), offset, length - 1, "ascii");
  buffer[offset + length - 1] = 0;
}

function padLength(size) {
  const remainder = size % 512;
  return remainder === 0 ? 0 : 512 - remainder;
}
