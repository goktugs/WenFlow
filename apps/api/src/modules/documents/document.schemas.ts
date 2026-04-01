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

export const updateDocumentCollaborationSchema = z
  .object({
    enabled: z.boolean(),
    password: z.string().trim().min(4).max(200).optional()
  })
  .superRefine((value, context) => {
    if (value.enabled && !value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required when collaboration is enabled"
      });
    }
  });

export const joinSharedDocumentSchema = z.object({
  password: z.string().trim().min(4).max(200)
});
