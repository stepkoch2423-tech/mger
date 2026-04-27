import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 78;

async function compressImage(file: File) {
  const source = Buffer.from(await file.arrayBuffer());

  return sharp(source)
    .rotate()
    .resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: IMAGE_QUALITY, effort: 4 })
    .toBuffer();
}

export async function POST(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Фотографии не выбраны." }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Файловое хранилище Vercel Blob не подключено." },
        { status: 503 },
      );
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) {
          throw new Error("Можно загружать только изображения.");
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error("Одна из фотографий превышает 12 МБ.");
        }

        const compressedImage = await compressImage(file);
        const fileName = `uploads/${randomUUID()}.webp`;
        const blob = await put(fileName, compressedImage, {
          access: "public",
          contentType: "image/webp",
        });

        return blob.url;
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
