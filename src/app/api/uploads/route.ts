import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

function normalizeExtension(file: File) {
  const explicit = extname(file.name);

  if (explicit) {
    return explicit.toLowerCase();
  }

  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  if (file.type === "image/jpeg") {
    return ".jpg";
  }

  return ".bin";
}

export async function POST(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!canManageEvents(currentUser?.role)) {
    return NextResponse.json({ error: "Загрузка доступна только модератору." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Фотографии не выбраны." }, { status: 400 });
    }

    await mkdir(join(process.cwd(), "public", "uploads"), { recursive: true });

    const urls = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error("Можно загружать только изображения.");
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error("Одна из фотографий превышает 8 МБ.");
        }

        const fileName = `${randomUUID()}${normalizeExtension(file)}`;
        const destination = join(process.cwd(), "public", "uploads", fileName);
        const bytes = await file.arrayBuffer();

        await writeFile(destination, Buffer.from(bytes));
        return `/uploads/${fileName}`;
      }),
    );

    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить фотографии.",
      },
      { status: 400 },
    );
  }
}
