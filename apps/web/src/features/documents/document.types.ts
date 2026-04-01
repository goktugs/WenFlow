export type DocumentListItem = {
  id: string;
  title: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = {
  id: string;
  title: string;
  contentJson: unknown;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

