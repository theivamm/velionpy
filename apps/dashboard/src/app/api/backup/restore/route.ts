import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, stat, unlink, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

const ROOT = join(/*turbopackIgnore: true*/ process.cwd(), "..", "..", "..");
const BACKUPS_DIR = join(ROOT, "backups");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { file, type } = body;

    if (type === "delete") {
      if (!file || file.includes("..")) {
        return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
      }
      const filePath = join(BACKUPS_DIR, file);
      await unlink(filePath);
      return NextResponse.json({ ok: true });
    }

    if (!file || file.includes("..")) {
      return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
    }

    const backupPath = join(BACKUPS_DIR, file);
    try {
      await stat(backupPath);
    } catch {
      return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });
    }

    const excludeDirs = [
      "node_modules", ".next", ".turbo", "out", "build", ".git", "backups", "coverage",
    ];
    const excludes = excludeDirs.map((d) => `--exclude="${d}"`).join(" ");

    await execAsync(
      `tar -xf "${backupPath}" ${excludes}`,
      { cwd: ROOT, timeout: 30000 }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
