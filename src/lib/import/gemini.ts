import { GoogleGenAI } from "@google/genai";

import {
  extractionResponseJsonSchema,
  extractionResultSchema,
  type ExtractionResult,
} from "@/lib/import/extraction-schema";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const BASE_PROMPT = [
  "Extract Amazon subscription records from input.",
  "Return strict JSON only matching the schema.",
  "quantity must be item count per delivery.",
  "priceYen must be integer JPY amount.",
  "If price is only shown in schedule/payment section, read it from there.",
  "If price is not visible in any provided image/text, set priceYen to 0.",
  "frequencyUnit must be week or month.",
].join(" ");

type RequestInput =
  | { kind: "text"; rawText: string }
  | { kind: "images"; images: Array<{ mimeType: string; base64Data: string }> };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatusCode(error: unknown): number | null {
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

export async function extractSubscriptions(input: RequestInput): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません。");
  }

  const ai = new GoogleGenAI({ apiKey });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const contents: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (input.kind === "text") {
        contents.push({ text: `${BASE_PROMPT}\n\nSource text:\n${input.rawText}` });
      } else {
        contents.push({ text: BASE_PROMPT });
        for (const image of input.images) {
          contents.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64Data,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: extractionResponseJsonSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Geminiから空の応答が返されました。");
      }

      const parsed = JSON.parse(text) as unknown;
      return extractionResultSchema.parse(parsed);
    } catch (error) {
      const statusCode = getStatusCode(error);
      const isRetryable = statusCode !== null && RETRYABLE_STATUS.has(statusCode);
      const canRetry = attempt < MAX_RETRIES;

      if (!isRetryable || !canRetry) {
        throw error;
      }

      await sleep(300 * 2 ** (attempt - 1));
    }
  }

  throw new Error("再試行後も解析に失敗しました。");
}
