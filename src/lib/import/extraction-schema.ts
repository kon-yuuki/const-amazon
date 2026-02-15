import { z } from "zod";

export const extractedItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive().max(999).default(1),
  priceYen: z.number().nonnegative(),
  frequencyUnit: z.enum(["week", "month"]),
  frequencyInterval: z.number().int().positive().max(52),
});

export const extractionResultSchema = z.object({
  items: z.array(extractedItemSchema),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const extractionResponseJsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          quantity: { type: "integer", minimum: 1, maximum: 999 },
          priceYen: { type: "number", minimum: 0 },
          frequencyUnit: { type: "string", enum: ["week", "month"] },
          frequencyInterval: { type: "integer", minimum: 1, maximum: 52 },
        },
        required: [
          "name",
          "quantity",
          "priceYen",
          "frequencyUnit",
          "frequencyInterval",
        ],
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;
