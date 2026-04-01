import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional()
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contentJson: z.unknown().optional()
})
  .refine(
    (value) => typeof value.title !== "undefined" || typeof value.contentJson !== "undefined",
    {
      message: "At least one field must be provided"
    }
  );
