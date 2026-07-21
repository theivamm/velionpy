import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

const ROOT = join(/*turbopackIgnore: true*/ process.cwd(), "..", "..", "..");
const BACKUPS_DIR = join(ROOT, "backups");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file || file.includes("..")) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const filePath = join(BACKUPS_DIR, file);
    const fileStat = await stat(filePath);
    const content = await readFile(filePath);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/x-tar",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Content-Length": fileStat.size.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
