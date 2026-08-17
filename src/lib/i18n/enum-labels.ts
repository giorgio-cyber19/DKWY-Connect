import type { Post, CalendarEvent, PrayerEntry, ArtworkItem, VideoItem, ChildDocument, SpiritualMilestone, DocumentItem, MediaItem, LessonPlan } from "@/lib/types";

/**
 * These map persisted English literals (stored in Redis, used as TypeScript
 * discriminants) to display labels. The stored value/type union is never
 * translated — only what's rendered to the user.
 */
type LabelMap<T extends string> = Record<T, string>;

const postTypeEn: LabelMap<Post["type"]> = {
  Announcement: "Announcement",
  "Weekly Update": "Weekly Update",
  Testimony: "Testimony",
  "Prayer Request": "Prayer Request",
  "Teaching Tip": "Teaching Tip",
  "Event Reminder": "Event Reminder",
  Photo: "Photo",
};
const postTypeNl: LabelMap<Post["type"]> = {
  Announcement: "Aankondiging",
  "Weekly Update": "Wekelijkse Update",
  Testimony: "Getuigenis",
  "Prayer Request": "Gebedsverzoek",
  "Teaching Tip": "Lestip",
  "Event Reminder": "Evenementherinnering",
  Photo: "Foto",
};

const eventTypeEn: LabelMap<CalendarEvent["type"]> = {
  "Sunday Lesson": "Sunday Lesson",
  "Teacher Meeting": "Teacher Meeting",
  "Children Event": "Children Event",
  "Holiday Program": "Holiday Program",
  VBS: "VBS",
  Birthday: "Birthday",
  "Parent Meeting": "Parent Meeting",
};
const eventTypeNl: LabelMap<CalendarEvent["type"]> = {
  "Sunday Lesson": "Zondagsles",
  "Teacher Meeting": "Lerarenvergadering",
  "Children Event": "Kinderevenement",
  "Holiday Program": "Vakantieprogramma",
  VBS: "Vakantiebijbelweek",
  Birthday: "Verjaardag",
  "Parent Meeting": "Oudervergadering",
};

const prayerTypeEn: LabelMap<PrayerEntry["type"]> = {
  "Prayer Request": "Prayer Request",
  "Praise Report": "Praise Report",
  Devotional: "Devotional",
  Encouragement: "Encouragement",
};
const prayerTypeNl: LabelMap<PrayerEntry["type"]> = {
  "Prayer Request": "Gebedsverzoek",
  "Praise Report": "Lofverslag",
  Devotional: "Overdenking",
  Encouragement: "Bemoediging",
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
  prayerType: { en: prayerTypeEn, nl: prayerTypeNl },
  artworkCategory: { en: artworkCategoryEn, nl: artworkCategoryNl },
  videoCategory: { en: videoCategoryEn, nl: videoCategoryNl },
  childDocumentType: { en: childDocumentTypeEn, nl: childDocumentTypeNl },
  milestoneCategory: { en: milestoneCategoryEn, nl: milestoneCategoryNl },
  documentCategory: { en: documentCategoryEn, nl: documentCategoryNl },
  mediaType: { en: mediaTypeEn, nl: mediaTypeNl },
  lessonStatus: { en: lessonStatusEn, nl: lessonStatusNl },
};
