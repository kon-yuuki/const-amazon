import { NextResponse } from "next/server";
import { z } from "zod";

import { extractSubscriptions } from "@/lib/import/gemini";

const textPayloadSchema = z.object({
  rawText: z.string().min(1).max(20000),
});

function toClientErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "リクエスト形式が不正です。";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "解析中に予期しないエラーが発生しました。";
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = textPayloadSchema.parse(await request.json());
      const result = await extractSubscriptions({
        kind: "text",
        rawText: body.rawText,
      });

      return NextResponse.json(
        {
          message: `${result.items.length}件を解析しました。`,
          items: result.items,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData
        .getAll("images")
        .filter((entry): entry is File => entry instanceof File);

      const singleImage = formData.get("image");
      if (files.length === 0 && singleImage instanceof File) {
        files.push(singleImage);
      }

      if (files.length === 0) {
        return NextResponse.json({ message: "画像ファイルを1つ以上指定してください。" }, { status: 400 });
      }

      const images = await Promise.all(
        files.map(async (file) => ({
          mimeType: file.type || "image/png",
          base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        })),
      );
      const result = await extractSubscriptions({
        kind: "images",
        images,
      });

      return NextResponse.json(
        {
          message: `${result.items.length}件を解析しました。`,
          items: result.items,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { message: "未対応のContent-Typeです。" },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = toClientErrorMessage(error);
    const status = message === "リクエスト形式が不正です。" ? 400 : 500;
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
