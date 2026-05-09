import type { Context } from "hono";
import { z } from "zod";

import type { AppBindings } from "@/middleware/auth";
import { getJwtPayload } from "@/middleware/auth";
import {
  documentParamsSchema,
  listDocumentsQuerySchema,
} from "@/api/v1/app/schemas/document.schema";
import DocumentService from "@/api/v1/services/document.service";
import respond from "@/utils/response.util";

const presignBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

const confirmBodySchema = z.object({
  title: z.string().trim().max(120).optional(),
  file: z.object({
    name: z.string().min(1),
    size: z.number().int().positive(),
    type: z.string().min(1),
    key: z.string().min(1),
    publicUrl: z.string().url(),
    contentHash: z.string().optional(),
  }),
});

export async function listDocuments(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const query = listDocumentsQuerySchema.parse(c.req.query());
  const result = await DocumentService.listDocuments(
    payload.sub,
    query.documentName ? query : undefined,
  );

  return respond(c, 200, "Documents fetched successfully", result);
}

/** Step 1 of R2 upload: returns a presigned PUT URL so the browser uploads directly to R2. */
export async function presignUpload(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const body = presignBodySchema.parse(await c.req.json());

  const result = await DocumentService.presignUpload({
    userId: payload.sub,
    fileName: body.fileName,
    mimeType: body.mimeType,
    fileSize: body.fileSize,
  });

  return respond(c, 200, "Presigned upload URL created", result);
}

/** Step 2 of R2 upload: browser calls this AFTER the PUT to R2 succeeds. */
export async function confirmUpload(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const body = confirmBodySchema.parse(await c.req.json());

  const document = await DocumentService.confirmUpload({
    userId: payload.sub,
    title: body.title,
    file: body.file,
  });

  return respond(c, 201, "Document uploaded successfully", { document });
}

/** @deprecated kept for compatibility; real uploads now go through presign → confirm */
export async function createDocument(c: Context<AppBindings>) {
  getJwtPayload(c);
  return respond(c, 410, "Use POST /documents/presign then POST /documents/confirm");
}

export async function getDocument(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = documentParamsSchema.parse(c.req.param());
  const document = await DocumentService.getDocument(payload.sub, params.documentId);

  return respond(c, 200, "Document fetched successfully", {
    document,
  });
}

export async function deleteDocument(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = documentParamsSchema.parse(c.req.param());
  await DocumentService.deleteDocument(payload.sub, params.documentId);

  return c.body(null, 204);
}

export async function reprocessDocument(c: Context<AppBindings>) {
  const payload = getJwtPayload(c);
  const params = documentParamsSchema.parse(c.req.param());
  const document = await DocumentService.reprocessDocument(
    payload.sub,
    params.documentId,
  );

  return respond(c, 202, "Document reprocessing accepted", {
    document,
  });
}
