import "dotenv/config";
import { execSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

function resolveFileUrl(url) {
  if (!url.startsWith("file:")) {
    throw new Error(`Only SQLite file DATABASE_URL is supported on Render bootstrap. Got: ${url}`);
  }

  const rawPath = url.slice(5);
  return rawPath.startsWith("/") ? rawPath : resolve(process.cwd(), rawPath);
}

function run(command) {
  execSync(command, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
}

function ensureUploadsSymlink(storageRoot) {
  const uploadsStoragePath = join(storageRoot, "uploads");
  const publicUploadsPath = process.env.PUBLIC_UPLOADS_PATH
    ? resolve(process.env.PUBLIC_UPLOADS_PATH)
    : join(process.cwd(), "public", "uploads");

  mkdirSync(uploadsStoragePath, { recursive: true });

  if (existsSync(publicUploadsPath)) {
    const stat = lstatSync(publicUploadsPath);

    if (stat.isSymbolicLink()) {
      return;
    }

    if (stat.isDirectory()) {
      const children = readdirSync(publicUploadsPath).filter((entry) => entry !== ".gitkeep");
      if (children.length === 0) {
        rmSync(publicUploadsPath, { recursive: true, force: true });
      } else {
        throw new Error(
          `public/uploads contains tracked files and cannot be replaced with a persistent symlink: ${children.join(", ")}`,
        );
      }
    } else {
      rmSync(publicUploadsPath, { force: true });
    }
  }

  symlinkSync(uploadsStoragePath, publicUploadsPath, "dir");
}

function removeIfExists(filePath) {
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
  }
}

function bootstrapDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const databasePath = resolveFileUrl(databaseUrl);
  const shouldReset = process.env.RESET_DATABASE_ON_BOOT === "true";

  mkdirSync(dirname(databasePath), { recursive: true });

  if (shouldReset) {
    removeIfExists(databasePath);
    removeIfExists(`${databasePath}-journal`);
    removeIfExists(`${databasePath}-shm`);
    removeIfExists(`${databasePath}-wal`);
  }

  if (!existsSync(databasePath)) {
    run("npm run db:init");
    run("npm run db:push");
    run("npm run db:seed");
    return;
  }

  run("npm run db:push");
}

function main() {
  const storageRoot = process.env.RENDER_STORAGE_PATH ?? join(process.cwd(), "render-data");
  mkdirSync(storageRoot, { recursive: true });
  ensureUploadsSymlink(storageRoot);
  bootstrapDatabase();
}

main();
