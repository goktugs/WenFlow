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
