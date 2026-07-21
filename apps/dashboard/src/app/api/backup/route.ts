import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, stat, mkdir } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

const ROOT = join(process.cwd(), "..", "..", "..");
const BACKUPS_DIR = join(ROOT, "backups");

export async function GET() {
  try {
    await mkdir(BACKUPS_DIR, { recursive: true });
    const files = await readdir(BACKUPS_DIR);
    const backups = [];

    for (const file of files) {
      if (!file.endsWith(".tar")) continue;
      const filePath = join(BACKUPS_DIR, file);
      const fileStat = await stat(filePath);
      backups.push({
        name: file,
        size: fileStat.size,
        createdAt: fileStat.mtime.toISOString(),
      });
    }

    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ backups });
  } catch (error) {
    return NextResponse.json({ backups: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = body.name || "";

    await mkdir(BACKUPS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = name ? `${timestamp}-${name}.tar` : `${timestamp}.tar`;
    const backupPath = join(BACKUPS_DIR, backupName);

    const includeItems = [
      "apps", "packages", "scripts",
      "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
      "turbo.json", ".gitignore", "supabase-schema.sql", "README.md",
    ];

    const excludeDirs = [
      "node_modules", ".next", ".turbo", "out", "build", ".git", "backups", "coverage",
    ];

    const items = includeItems
      .filter((item) => {
        try {
          const { statSync } = require("fs");
          statSync(join(ROOT, item));
          return true;
        } catch {
          return false;
        }
      })
      .join(" ");

    const excludes = excludeDirs.map((d) => `--exclude="${d}"`).join(" ");

    await execAsync(
      `tar -cf "${backupPath}" ${excludes} ${items}`,
      { cwd: ROOT, timeout: 30000 }
    );

    const fileStat = await stat(backupPath);

    return NextResponse.json({
      ok: true,
      backup: {
        name: backupName,
        size: fileStat.size,
        createdAt: fileStat.mtime.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
