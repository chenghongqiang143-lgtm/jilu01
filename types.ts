
export enum WidgetType {
  LIST = 'LIST',         // Reading lists, todos
  RATING = 'RATING',     // Books, movies, food
  COUNTDOWN = 'COUNTDOWN', // Days left
  LAST_DONE = 'LAST_DONE', // "Last time I did X"
  PLAN = 'PLAN',         // Formerly SOP. Now Daily Plan/Journal with questions
  DATA = 'DATA',         // Line chart trends
  NOTE = 'NOTE'          // Notebook widget (formerly sticky note)
}

export interface Note {
  id: string;
  content: string; // Stored as HTML now
  tags: string[];
  createdAt: number;
}

export interface NotebookItem {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  completed: boolean;
  starred?: boolean; // New: Favorite/Pin
  category?: string;
}

export interface RatingItem {
  id: string;
  title: string;
  rating: number; // 0-5
  category: string; // Changed from enum to string for dynamic categories
  cover?: string; // URL for cover image
  review?: string; // Optional text review
}

export interface DataPoint {
  date: string;
  value: number;
}

export interface PlanQuestion {
  id: string;
  text: string;
}

// Map: DateString (YYYY-MM-DD) -> { QuestionID: AnswerString }
export type PlanRecords = Record<string, Record<string, string>>;

export interface SOPItem {
  id: string;
  timeBlock: string;
  task: string;
  completed: boolean;
}

// Union type for widget data
export type WidgetData = 
  | { items: PlaylistItem[]; categories: string[] }         // LIST
  | { items: RatingItem[]; categories: string[] }           // RATING
  | { targetDate: string; eventName: string }               // COUNTDOWN
  | { lastDate: number; frequencyDays: number; history?: number[] } // LAST_DONE
  | { questions: PlanQuestion[]; records: PlanRecords }     // PLAN
  | { label: string; unit: string; points: DataPoint[] }    // DATA
  | { items: NotebookItem[] };                              // NOTE (Notebook Widget)

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  data: WidgetData;
  color?: string; // Optional accent color
  dashboardCategory?: string; // For dashboard grouping
}
