export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO 8601 date string
  description: string | null;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

export interface EventListData {
  events: CalendarEvent[];
  lastModified: string;
}
