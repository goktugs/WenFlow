export const APP_NAME = "WenFlow";

// Auth types (wire format — dates as ISO strings)
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

// Document types (wire format)
export type DocumentOwner = {
  id: string;
  name: string;
  email: string;
};

export type DocumentListItem = {
  id: string;
  title: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: DocumentOwner;
  isOwner: boolean;
  isCollaborationEnabled: boolean;
  isCollaborationReadOnly: boolean;
};

export type DocumentDetail = {
  id: string;
  title: string;
  contentJson: unknown;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: DocumentOwner;
  isOwner: boolean;
  isCollaborationEnabled: boolean;
  isCollaborationReadOnly: boolean;
  isReadOnly: boolean;
  accessCode: string | null;
};

export type DocumentVersion = {
  id: string;
  titleSnapshot: string;
  versionNumber: number;
  createdAt: string;
  createdByUserId: string | null;
};
