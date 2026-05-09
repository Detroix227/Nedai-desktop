import { Hono } from "hono";

import type { AppBindings } from "@/middleware/auth";
import { requireAuth } from "@/middleware/auth";
import {
  confirmUpload,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  presignUpload,
  reprocessDocument,
} from "@/api/v1/app/controllers/document.controller";

const router = new Hono<AppBindings>();

router.use("*", requireAuth);
router.get("/", listDocuments);
router.post("/", createDocument);            // deprecated, returns 410
router.post("/presign", presignUpload);      // Step 1: get presigned R2 URL
router.post("/confirm", confirmUpload);      // Step 2: confirm upload + create DB record
router.get("/:documentId", getDocument);
router.delete("/:documentId", deleteDocument);
router.post("/:documentId/reprocess", reprocessDocument);

export default router;
