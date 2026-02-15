import { NextResponse } from "next/server";
import { z } from "zod";

import { extractSubscriptions } from "@/lib/import/gemini";

const textPayloadSchema = z.object({
  rawText: z.string().min(1).max(20000),
});

function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const status = (error as { status?: number }).status;
  const code = (error as { code?: number }).code;

  if (typeof status === "number") {
    return status;
  }

  if (typeof code === "number") {
    return code;
  }

  return null;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "";
}

function toClientErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return "リクエスト形式が不正です。";
  }

  const status = getErrorStatus(error);
  const text = getErrorText(error);

  if (text.includes("GEMINI_API_KEY")) {
    return "いま解析の準備がうまくできていないみたいです🙇 少し時間をおいて、もう一度試してみてください。";
  }

  if (status === 429) {
    return "アクセスが集中していて、解析が混み合っています🕰️ 少し待ってから、もう一度試してみてください。";
  }

  if (status !== null && status >= 500) {
    return "いま解析サービス側がちょっと不安定みたいです💦 時間をおいて、もう一度試してみてください。";
  }

  if (text) {
    return `うまく解析できませんでした😢 ${text}`;
  }

  return "うまく解析できませんでした😢 少し時間をおいて、もう一度試してみてください。";
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

      const expectedItemCountRaw = formData.get("expectedItemCount");
      const expectedItemCount = typeof expectedItemCountRaw === "string" && expectedItemCountRaw.trim()
        ? Number(expectedItemCountRaw)
        : undefined;
      const normalizedExpectedItemCount =
        typeof expectedItemCount === "number" && Number.isInteger(expectedItemCount) && expectedItemCount > 0
          ? expectedItemCount
          : undefined;

      const images = await Promise.all(
        files.map(async (file) => ({
          mimeType: file.type || "image/png",
          base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        })),
      );
      const result = await extractSubscriptions({
        kind: "images",
        images,
        expectedItemCount: normalizedExpectedItemCount,
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
    const status =
      message === "リクエスト形式が不正です。"
        ? 400
        : getErrorStatus(error) === 429
          ? 429
          : 500;
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
