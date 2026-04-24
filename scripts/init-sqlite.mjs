import "dotenv/config";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { DatabaseSync } from "node:sqlite";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

if (!databaseUrl.startsWith("file:")) {
  throw new Error(`Unsupported DATABASE_URL: ${databaseUrl}`);
}

const databasePath = resolve(process.cwd(), databaseUrl.slice(5));
mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ACTIVIST' CHECK ("role" IN ('OWNER', 'MODERATOR', 'ACTIVIST')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "capacity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Event_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "EventPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "EventPhoto_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "EventResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL CHECK ("status" IN ('GOING', 'DECLINED')),
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "EventResponse_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventResponse_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");
  CREATE UNIQUE INDEX IF NOT EXISTS "EventResponse_eventId_userId_key" ON "EventResponse"("eventId", "userId");
  CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
  CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
  CREATE INDEX IF NOT EXISTS "Event_createdById_idx" ON "Event"("createdById");
  CREATE INDEX IF NOT EXISTS "Event_startAt_idx" ON "Event"("startAt");
  CREATE INDEX IF NOT EXISTS "EventPhoto_eventId_sortOrder_idx" ON "EventPhoto"("eventId", "sortOrder");
  CREATE INDEX IF NOT EXISTS "EventResponse_eventId_status_idx" ON "EventResponse"("eventId", "status");
  CREATE INDEX IF NOT EXISTS "EventResponse_userId_idx" ON "EventResponse"("userId");
`);

db.close();
console.log(`SQLite initialized at ${databasePath}`);
