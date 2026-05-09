export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiErrorPayload = {
  success: boolean;
  message: string;
  data?: Record<string, unknown> | unknown[];
};

export type UserRole = "STUDENT" | "LECTURER" | "ADMIN";

export type ProfileCompletion = {
  isComplete: boolean;
  missingFields: string[];
};

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  institution: string | null;
  matricNumber: string | null;
  studentAcademicLevel: string | null;
  dateOfBirth: string | null;
  lecturerHighestQualification: string | null;
  lecturerCurrentAcademicStage: string | null;
  age: number | null;
  maritalStatus: string | null;
  academicLevel: string | null;
  institutionalLevel: string | null;
  futureCareer: string | null;
  profileCompletion: ProfileCompletion;
  createdAt: string;
  updatedAt: string;
};

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;
};

export type MessageSource = {
  subject: string;
  lessonTitle: string;
  sourcePath: string;
  pageNumber?: number;
};

export type DocumentSourceType = "DOCX" | "DOC" | "PDF";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

export type DocumentSummary = {
  id: string;
  title: string;
  originalFilename: string;
  sourceType: DocumentSourceType;
  status: DocumentStatus;
  byteSize: number;
  chunkCount: number;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = DocumentSummary;

export type DocumentQuota = {
  maxDocuments: number;
  usedDocuments: number;
  maxBytes: number;
  usedBytes: number;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  isPinned?: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  deliveryState?: "pending" | "failed";
  grounded?: boolean;
  usedGeneralKnowledge?: boolean;
  sources?: MessageSource[];
  documentId?: string;
  document?: {
    id: string;
    title: string;
    sourceType: string;
  };
};

export type SendChatMessagePayload = {
  chatId?: string;
  content: string;
  documentId?: string;
  document?: {
    id: string;
    title: string;
    sourceType: string;
  };
};

export type ServerAuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type ServerCurrentUserResponse = {
  user: AuthUser;
};

export type ServerUpdateCurrentUserResponse = {
  user: AuthUser;
};

export type ServerChangePasswordResponse = Record<string, never>;

export type ServerListChatsResponse = {
  chats: ChatThread[];
};

export type ServerGetChatMessagesResponse = {
  chat: ChatThread;
  messages: ChatMessage[];
};

export type ServerSendMessageResponse = {
  chat: ChatThread;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  answer: {
    answer: string;
    grounded: boolean;
    usedGeneralKnowledge: boolean;
    sources: MessageSource[];
  };
  contextUsage?: number;
};

export type ServerDeleteChatResponse = {
  success: boolean;
};

export type ServerUpdateChatResponse = {
  chat: ChatThread;
};

export type ServerListDocumentsResponse = {
  documents: DocumentSummary[];
  quota: DocumentQuota;
};

export type ServerGetDocumentResponse = {
  document: DocumentDetail;
};

export type ServerCreateDocumentResponse = {
  document: DocumentSummary;
};

export type ServerReprocessDocumentResponse = {
  document: DocumentSummary;
};

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type TimetableActivity = {
  id: string;
  userId: string;
  name: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type ServerListTimetableActivitiesResponse = {
  activities: TimetableActivity[];
};

export type ServerCreateTimetableActivityResponse = {
  activity: TimetableActivity;
};

export type ServerUpdateTimetableActivityResponse = {
  activity: TimetableActivity;
};

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type ServerGetNotificationsResponse = {
  notifications: Notification[];
};
