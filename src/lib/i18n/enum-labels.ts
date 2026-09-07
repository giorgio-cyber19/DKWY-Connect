import type { Post, CalendarEvent, Holiday, ArtworkItem, VideoItem, ChildDocument, SpiritualMilestone, DocumentItem, MediaItem, LessonPlan } from "@/lib/types";

/**
 * These map persisted English literals (stored in Redis, used as TypeScript
 * discriminants) to display labels. The stored value/type union is never
 * translated — only what's rendered to the user.
 */
type LabelMap<T extends string> = Record<T, string>;

const postTypeEn: LabelMap<Post["type"]> = {
  Update: "Update",
  Announcement: "Announcement",
  Photo: "Photo",
  Devotional: "Devotional",
  Prayer: "Prayer",
};
const postTypeNl: LabelMap<Post["type"]> = {
  Update: "Update",
  Announcement: "Aankondiging",
  Photo: "Foto",
  Devotional: "Overdenking",
  Prayer: "Gebed",
};

const eventTypeEn: LabelMap<CalendarEvent["type"]> = {
  "Sunday Lesson": "Sunday Lesson",
  "Teacher Meeting": "Teacher Meeting",
  "Children Event": "Children Event",
  "Holiday Program": "Holiday Program",
  VBS: "VBS",
  Birthday: "Birthday",
  "Parent Meeting": "Parent Meeting",
  "Sunday School & Youth Roster": "Sunday School & Youth Roster",
};
const eventTypeNl: LabelMap<CalendarEvent["type"]> = {
  "Sunday Lesson": "Zondagsles",
  "Teacher Meeting": "Lerarenvergadering",
  "Children Event": "Kinderevenement",
  "Holiday Program": "Vakantieprogramma",
  VBS: "Vakantiebijbelweek",
  Birthday: "Verjaardag",
  "Parent Meeting": "Oudervergadering",
  "Sunday School & Youth Roster": "Rooster Zondagsschool & Jeugd",
};

const holidayTypeEn: LabelMap<Holiday["type"]> = {
  school_vacation: "School Vacation",
  national_holiday: "National Holiday",
};
const holidayTypeNl: LabelMap<Holiday["type"]> = {
  school_vacation: "Schoolvakantie",
  national_holiday: "Nationale Feestdag",
};

const artworkCategoryEn: LabelMap<ArtworkItem["category"]> = {
  Drawing: "Drawing",
  "Coloring Page": "Coloring Page",
  Craft: "Craft",
  Worksheet: "Worksheet",
};
const artworkCategoryNl: LabelMap<ArtworkItem["category"]> = {
  Drawing: "Tekening",
  "Coloring Page": "Kleurplaat",
  Craft: "Knutselwerk",
  Worksheet: "Werkblad",
};

const videoCategoryEn: LabelMap<VideoItem["category"]> = {
  Recitation: "Recitation",
  Performance: "Performance",
  Activity: "Activity",
  "Special Event": "Special Event",
};
const videoCategoryNl: LabelMap<VideoItem["category"]> = {
  Recitation: "Voordracht",
  Performance: "Optreden",
  Activity: "Activiteit",
  "Special Event": "Speciaal Evenement",
};

const childDocumentTypeEn: LabelMap<ChildDocument["type"]> = {
  "Permission Form": "Permission Form",
  Evaluation: "Evaluation",
  "Progress Report": "Progress Report",
  "Attendance Note": "Attendance Note",
};
const childDocumentTypeNl: LabelMap<ChildDocument["type"]> = {
  "Permission Form": "Toestemmingsformulier",
  Evaluation: "Evaluatie",
  "Progress Report": "Voortgangsrapport",
  "Attendance Note": "Aanwezigheidsnotitie",
};

const milestoneCategoryEn: LabelMap<SpiritualMilestone["category"]> = {
  "Memory Verse": "Memory Verse",
  "Bible Knowledge": "Bible Knowledge",
  Participation: "Participation",
  Prayer: "Prayer",
  Kindness: "Kindness",
  Achievement: "Achievement",
};
const milestoneCategoryNl: LabelMap<SpiritualMilestone["category"]> = {
  "Memory Verse": "Memorisatievers",
  "Bible Knowledge": "Bijbelkennis",
  Participation: "Deelname",
  Prayer: "Gebed",
  Kindness: "Vriendelijkheid",
  Achievement: "Prestatie",
};

const documentCategoryEn: LabelMap<DocumentItem["category"]> = {
  "Permission Forms": "Permission Forms",
  Evaluations: "Evaluations",
  "Progress Reports": "Progress Reports",
  "Attendance Notes": "Attendance Notes",
  Policies: "Policies",
};
const documentCategoryNl: LabelMap<DocumentItem["category"]> = {
  "Permission Forms": "Toestemmingsformulieren",
  Evaluations: "Evaluaties",
  "Progress Reports": "Voortgangsrapporten",
  "Attendance Notes": "Aanwezigheidsnotities",
  Policies: "Beleid",
};

const mediaTypeEn: LabelMap<MediaItem["type"]> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  doc: "Document",
  ppt: "Presentation",
};
const mediaTypeNl: LabelMap<MediaItem["type"]> = {
  image: "Afbeelding",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  doc: "Document",
  ppt: "Presentatie",
};

const lessonStatusEn: LabelMap<LessonPlan["status"]> = {
  draft: "Draft",
  published: "Published",
};
const lessonStatusNl: LabelMap<LessonPlan["status"]> = {
  draft: "Concept",
  published: "Gepubliceerd",
};

export const enumLabels = {
  postType: { en: postTypeEn, nl: postTypeNl },
  eventType: { en: eventTypeEn, nl: eventTypeNl },
  holidayType: { en: holidayTypeEn, nl: holidayTypeNl },
  artworkCategory: { en: artworkCategoryEn, nl: artworkCategoryNl },
  videoCategory: { en: videoCategoryEn, nl: videoCategoryNl },
  childDocumentType: { en: childDocumentTypeEn, nl: childDocumentTypeNl },
  milestoneCategory: { en: milestoneCategoryEn, nl: milestoneCategoryNl },
  documentCategory: { en: documentCategoryEn, nl: documentCategoryNl },
  mediaType: { en: mediaTypeEn, nl: mediaTypeNl },
  lessonStatus: { en: lessonStatusEn, nl: lessonStatusNl },
};
