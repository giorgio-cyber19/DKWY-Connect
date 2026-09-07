export type Role = "admin" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  passwordHash: string;
  role: Role;
  avatarColor: string;
  photo?: string;
  classId?: string;
  title: string;
  joined: string;
  status: "active" | "disabled";
  bio?: string;
  mustChangePassword?: boolean;
  /** Personal accent color override (hex), chosen via the color wheel in Settings. Unset = app default green. */
  accentColor?: string;
}

export interface AgeGroup {
  id: string;
  name: string;
  range: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  ageGroupId: string;
  teacherIds: string[];
  room: string;
  color: string;
  childCount: number;
}

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export interface ArtworkItem {
  id: string;
  title: string;
  date: string;
  imageColor: string;
  category: "Drawing" | "Coloring Page" | "Craft" | "Worksheet";
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface PhotoAlbum {
  id: string;
  title: string;
  date: string;
  event: string;
  coverColor: string;
  photoCount: number;
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  date: string;
  category: "Recitation" | "Performance" | "Activity" | "Special Event";
  duration: string;
  coverColor: string;
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface ChildDocument {
  id: string;
  title: string;
  type: "Permission Form" | "Evaluation" | "Progress Report" | "Attendance Note";
  date: string;
  fileType: "pdf" | "docx";
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface SpiritualMilestone {
  id: string;
  label: string;
  category: "Memory Verse" | "Bible Knowledge" | "Participation" | "Prayer" | "Kindness" | "Achievement";
  date: string;
  note?: string;
}

export interface TeacherObservation {
  id: string;
  date: string;
  authorId: string;
  note: string;
  tag?: string;
}

export interface Child {
  id: string;
  name: string;
  photoColor: string;
  age: number;
  birthday: string;
  classId: string;
  teacherId?: string;
  enrollmentDate: string;
  guardians: Guardian[];
  address?: string;
  allergies?: string;
  artwork: ArtworkItem[];
  albums: PhotoAlbum[];
  videos: VideoItem[];
  documents: ChildDocument[];
  milestones: SpiritualMilestone[];
  observations: TeacherObservation[];
}

export interface LessonAttachment {
  id: string;
  name: string;
  type: "pdf" | "docx" | "pptx" | "image" | "youtube";
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface LessonPlan {
  id: string;
  title: string;
  passage: string;
  theme: string;
  memoryVerse: string;
  ageGroupId: string;
  date: string;
  status: "draft" | "published";
  authorId: string;
  objectives: string[];
  openingActivity: string;
  bibleStory: string;
  discussionQuestions: string[];
  craftActivity: string;
  worshipSongs: string[];
  closingPrayer: string;
  homework: string;
  attachments: LessonAttachment[];
  coverColor: string;
  updatedAt: string;
  versions: number;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  date: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Post {
  id: string;
  authorId: string;
  type: "Update" | "Announcement" | "Photo" | "Devotional" | "Prayer";
  content: string;
  date: string;
  pinned: boolean;
  imageColor?: string;
  driveFileId?: string;
  driveViewUrl?: string;
  /** Only meaningful for type "Prayer" — who has tapped "I prayed for this". */
  prayedByUserIds?: string[];
  reactions: Reaction[];
  comments: Comment[];
  poll?: { question: string; options: PollOption[]; votesByUser: Record<string, number> };
  mentions?: string[];
}

export interface MediaItem {
  id: string;
  name: string;
  folder: string;
  type: "image" | "video" | "audio" | "pdf" | "doc" | "ppt";
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
  color: string;
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: "Permission Forms" | "Evaluations" | "Progress Reports" | "Attendance Notes" | "Policies";
  fileType: "pdf" | "docx" | "xlsx";
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  driveFileId?: string;
  driveViewUrl?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  type:
    | "Sunday Lesson"
    | "Teacher Meeting"
    | "Children Event"
    | "Holiday Program"
    | "VBS"
    | "Birthday"
    | "Parent Meeting"
    | "Sunday School & Youth Roster";
  location?: string;
  description?: string;
  color: string;
  /** Set only for events created from a RosterEntry — the backward link. */
  rosterId?: string;
}

export interface Holiday {
  id: string;
  /** Kept in Dutch exactly as published by the school — never translated. */
  name: string;
  type: "school_vacation" | "national_holiday";
  /** "YYYY-MM-DD" — inclusive. Equal to endDate for a single-day national holiday. */
  startDate: string;
  /** "YYYY-MM-DD" — inclusive. */
  endDate: string;
  /** True while the date is unconfirmed (e.g. moon-sighting-dependent Islamic holidays). */
  provisional: boolean;
  /** e.g. "2025-2026". */
  schoolYear: string;
}

export interface RosterEntry {
  id: string;
  /** "YYYY-MM-DD" — any day of the week, not restricted to Sundays. */
  date: string;
  sundaySchoolUserIds: string[];
  teenClubUserIds: string[];
  theme: string;
  notes: string;
  serviceType: string;
  preacher: string;
  liturgy: string;
  musicalAccompaniment: string;
  /** Forward link to the linked CalendarEvent — always set. */
  calendarEventId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  type: "lesson" | "portfolio" | "comment" | "event" | "prayer" | "admin";
  href: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  date: string;
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

/** Lightweight listing shape — never carries `messages`, so the sidebar list stays cheap regardless of conversation length. */
export type AiConversationSummary = Omit<AiConversation, "messages" | "userId">;

/**
 * One highlighted Bible verse, saved per-teacher. Deliberately one record per verse (not
 * per highlight *action*, which can span several verses at once) — matches how the Bible
 * reader itself scopes a highlight-remove to "the selected verses currently showing that
 * color", so removing part of a previously-highlighted range never requires splitting a
 * stored range back apart.
 */
export interface SavedVerseHighlight {
  /** USFM version id from the Bible reader, e.g. 3034 for the Berean Standard Bible. */
  versionId: number;
  /** USFM passage id, e.g. "JHN.3.16" — unique together with versionId. */
  passageId: string;
  /** USFM book code, e.g. "JHN". */
  book: string;
  chapter: string;
  verse: number;
  /** 6-character lowercase hex, no "#" — one of the Bible reader's 5 preset highlight colors. */
  color: string;
  /** Human-readable reference captured at highlight time, e.g. "John 3:16" (or a range if several verses were highlighted together). */
  reference: string;
  createdAt: string;
}
