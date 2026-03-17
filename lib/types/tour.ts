export interface Tour {
  id: string;
  name: string;
  description: string;
  createdAt: string; // ISO 8601
}

export interface TourListData {
  tours: Tour[];
  lastModified: string;
}
