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
  teacherId: string;
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
  attendanceRate: number;
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
  type: "Announcement" | "Weekly Update" | "Testimony" | "Prayer Request" | "Teaching Tip" | "Event Reminder" | "Photo";
  content: string;
  date: string;
  pinned: boolean;
  imageColor?: string;
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
  type: "Sunday Lesson" | "Teacher Meeting" | "Children Event" | "Holiday Program" | "VBS" | "Birthday" | "Parent Meeting";
  location?: string;
  description?: string;
  color: string;
}

export interface PrayerEntry {
  id: string;
  authorId: string;
  type: "Prayer Request" | "Praise Report" | "Devotional" | "Encouragement";
  content: string;
  verse?: string;
  date: string;
  prayedByUserIds: string[];
  hasVoiceNote?: boolean;
  voiceDuration?: string;
  driveFileId?: string;
  driveViewUrl?: string;
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
