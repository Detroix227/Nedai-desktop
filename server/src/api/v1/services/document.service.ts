import path from "node:path";

import {
  DocumentOrigin,
  DocumentStatus,
  DocumentVisibility,
} from "@prisma/client";

import { ApiError } from "@/lib/api-error";
import prisma from "@/lib/prisma";
import { serializeDocument } from "@/api/v1/serializers/document.serializer";
import {
  MAX_DOCUMENTS_PER_USER,
  MAX_TOTAL_BYTES,
} from "@/api/v1/services/document.constants";
import UserDocumentIngestion from "@/api/v1/services/user-document-ingestion.service";
import DocumentParser from "@/api/v1/services/document-parser.service";
import DocumentStorage from "@/api/v1/services/document-storage.service";
import { deleteR2FileByUrl, generatePresignedUploadUrl, getR2PublicUrl } from "@/lib/r2";
import { isRemoteFileUrl } from "@/utils/url.util";

function buildDefaultTitle(filename: string) {
  const parsed = path.parse(filename);
  return parsed.name || "Untitled document";
}

export class DocumentServiceImpl {
  public async listDocuments(
    userId: string,
    options?: {
      documentName?: string;
    },
  ) {
    const documentName = options?.documentName?.trim();
    const [documents, quota] = await Promise.all([
      prisma.documents.findMany({
        where: {
          userId,
          visibility: DocumentVisibility.PRIVATE,
          origin: DocumentOrigin.USER_UPLOAD,
          ...(documentName
            ? {
                OR: [
                  {
                    title: {
                      contains: documentName,
                      mode: "insensitive",
                    },
                  },
                  {
                    originalFilename: {
                      contains: documentName,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.getQuota(userId),
    ]);

    return {
      documents: documents.map(serializeDocument),
      quota,
    };
  }

  public async getDocument(userId: string, documentId: string) {
    const document = await this.getOwnedDocument(userId, documentId);
    return serializeDocument(document);
  }

  public async uploadDocument() {
    throw new ApiError(410, "Use the UploadThing upload flow");
  }

  public async presignUpload(options: {
    userId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    const { MAX_FILE_BYTES } = await import("@/api/v1/services/document.constants");

    if (options.fileSize > MAX_FILE_BYTES) {
      throw new ApiError(413, "The file exceeds the 20 MB upload limit");
    }

    const quota = await this.getQuota(options.userId);

    if (quota.usedDocuments >= quota.maxDocuments) {
      throw new ApiError(409, "You have reached the document limit");
    }

    if (quota.usedBytes + options.fileSize > quota.maxBytes) {
      throw new ApiError(409, "This upload would exceed your storage quota");
    }

    // Build a unique object key: uploads/{userId}/{uuid}-{filename}
    const ext = path.extname(options.fileName);
    const key = `uploads/${options.userId}/${crypto.randomUUID()}${ext}`;
    const uploadUrl = await generatePresignedUploadUrl(key, options.mimeType);
    const publicUrl = getR2PublicUrl(key);

    return { uploadUrl, fileKey: key, publicUrl };
  }

  public async confirmUpload(options: {
    userId: string;
    title?: string;
    file: {
      name: string;
      size: number;
      type: string;
      key: string;      // R2 object key
      publicUrl: string;
      contentHash?: string;
    };
  }) {
    const sourceType = DocumentParser.getSourceType(options.file.name);
    await DocumentParser.assertUploadSupported(sourceType);

    const quota = await this.getQuota(options.userId);

    if (quota.usedDocuments >= quota.maxDocuments) {
      throw new ApiError(409, "You have reached the document limit");
    }

    if (quota.usedBytes + options.file.size > quota.maxBytes) {
      throw new ApiError(409, "This upload would exceed your storage quota");
    }

    if (options.file.contentHash) {
      const duplicate = await prisma.documents.findFirst({
        where: { userId: options.userId, contentHash: options.file.contentHash },
        select: { id: true },
      });
      if (duplicate) {
        // Clean up the R2 file we just received since it's a duplicate
        await deleteR2FileByUrl(options.file.publicUrl);
        throw new ApiError(409, "This document has already been uploaded");
      }
    }

    const document = await prisma.documents.create({
      data: {
        userId: options.userId,
        visibility: DocumentVisibility.PRIVATE,
        origin: DocumentOrigin.USER_UPLOAD,
        title:
          typeof options.title === "string" && options.title.trim().length > 0
            ? options.title.trim()
            : buildDefaultTitle(options.file.name),
        originalFilename: options.file.name,
        mimeType: options.file.type || "application/octet-stream",
        storagePath: options.file.publicUrl, // public R2 URL
        status: DocumentStatus.UPLOADED,
        sourceType,
        byteSize: options.file.size,
        contentHash: options.file.contentHash ?? null,
      },
    });

    UserDocumentIngestion.queue(document.id);

    return serializeDocument(document);
  }

  public async deleteDocument(userId: string, documentId: string) {
    const document = await this.getOwnedDocument(userId, documentId);

    await prisma.documents.delete({
      where: { id: document.id },
    });

    if (isRemoteFileUrl(document.storagePath)) {
      await deleteR2FileByUrl(document.storagePath);
      return;
    }

    await DocumentStorage.deleteStoredFile(document.storagePath);
  }

  public async reprocessDocument(userId: string, documentId: string) {
    const document = await this.getOwnedDocument(userId, documentId);

    const updated = await prisma.documents.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.UPLOADED,
        chunkCount: 0,
        processingError: null,
      },
    });

    await prisma.documentChunk.deleteMany({
      where: { documentId: document.id },
    });

    UserDocumentIngestion.queue(document.id);

    return serializeDocument(updated);
  }

  private async getOwnedDocument(userId: string, documentId: string) {
    const document = await prisma.documents.findFirst({
      where: {
        id: documentId,
        userId,
        visibility: DocumentVisibility.PRIVATE,
        origin: DocumentOrigin.USER_UPLOAD,
      },
    });

    if (!document) {
      throw new ApiError(404, "Document not found");
    }

    return document;
  }

  public async getQuota(userId: string) {
    const [usedDocuments, aggregate] = await Promise.all([
      prisma.documents.count({
        where: {
          userId,
          visibility: DocumentVisibility.PRIVATE,
          origin: DocumentOrigin.USER_UPLOAD,
        },
      }),
      prisma.documents.aggregate({
        where: {
          userId,
          visibility: DocumentVisibility.PRIVATE,
          origin: DocumentOrigin.USER_UPLOAD,
        },
        _sum: {
          byteSize: true,
        },
      }),
    ]);

    return {
      maxDocuments: MAX_DOCUMENTS_PER_USER,
      usedDocuments,
      maxBytes: MAX_TOTAL_BYTES,
      usedBytes: aggregate._sum.byteSize ?? 0,
    };
  }

  public async createDocumentFromUpload(options: {
    userId: string;
    title?: string;
    file: {
      name: string;
      size: number;
      type: string;
      ufsUrl: string;
      fileHash: string;
    };
  }) {
    const sourceType = DocumentParser.getSourceType(options.file.name);
    await DocumentParser.assertUploadSupported(sourceType);

    const quota = await this.getQuota(options.userId);

    if (quota.usedDocuments >= quota.maxDocuments) {
      throw new ApiError(409, "You have reached the 10 document limit");
    }

    if (quota.usedBytes + options.file.size > quota.maxBytes) {
      throw new ApiError(
        409,
        "This upload would exceed your total storage quota",
      );
    }

    const contentHash = options.file.fileHash || null;

    if (contentHash) {
      const duplicateDocument = await prisma.documents.findFirst({
        where: {
          userId: options.userId,
          contentHash,
        },
        select: {
          id: true,
        },
      });

      if (duplicateDocument) {
        throw new ApiError(409, "This document has already been uploaded");
      }
    }

    const document = await prisma.documents.create({
      data: {
        userId: options.userId,
        visibility: DocumentVisibility.PRIVATE,
        origin: DocumentOrigin.USER_UPLOAD,
        title:
          typeof options.title === "string" && options.title.trim().length > 0
            ? options.title.trim()
            : buildDefaultTitle(options.file.name),
        originalFilename: options.file.name,
        mimeType:
          options.file.type ||
          (sourceType === "PDF"
            ? "application/pdf"
            : sourceType === "DOCX"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : sourceType === "IMAGE"
                ? "image/png"
                : "application/msword"),
        storagePath: options.file.ufsUrl,
        status: DocumentStatus.UPLOADED,
        sourceType,
        byteSize: options.file.size,
        contentHash,
      },
    });

    UserDocumentIngestion.queue(document.id);

    return document;
  }
}

const DocumentService = new DocumentServiceImpl();

export default DocumentService;
