import "server-only";
import { GET as bootstrapGET } from "@/app/api/data/bootstrap/route";
import { POST as eventsPOST } from "@/app/api/events/route";
import { PATCH as eventPATCH, DELETE as eventDELETE } from "@/app/api/events/[id]/route";
import { POST as lessonsPOST } from "@/app/api/lessons/route";
import { PATCH as lessonPATCH } from "@/app/api/lessons/[id]/route";
import { POST as postsPOST, DELETE as postsDELETE } from "@/app/api/posts/route";
import { PATCH as postPATCH } from "@/app/api/posts/[id]/route";
import { POST as holidaysPOST } from "@/app/api/holidays/route";
import { PATCH as holidayPATCH, DELETE as holidayDELETE } from "@/app/api/holidays/[id]/route";
import { POST as childrenPOST } from "@/app/api/children/route";
import { POST as childRecordsPOST } from "@/app/api/children/[id]/records/route";
import { DELETE as childDELETE } from "@/app/api/children/[id]/route";
import { POST as classesPOST } from "@/app/api/classes/route";
import { PATCH as classPATCH, DELETE as classDELETE } from "@/app/api/classes/[id]/route";
import { POST as ageGroupsPOST } from "@/app/api/age-groups/route";
import { POST as rosterPOST } from "@/app/api/roster/route";
import { PATCH as rosterPATCH, DELETE as rosterDELETE } from "@/app/api/roster/[id]/route";
import { POST as foldersPOST } from "@/app/api/library-folders/route";
import { PATCH as folderPATCH, DELETE as folderDELETE } from "@/app/api/library-folders/[id]/route";
import { DELETE as documentDELETE } from "@/app/api/documents/[id]/route";
import { DELETE as mediaDELETE } from "@/app/api/media/[id]/route";
import { PATCH as notificationsPATCH, DELETE as notificationsDELETE } from "@/app/api/notifications/route";
import { PATCH as profilePATCH } from "@/app/api/users/me/route";
import { GET as attendanceGET, PUT as attendancePUT } from "@/app/api/attendance/route";
import { matchNames, splitNameList } from "@/lib/name-match";
import { addDays, summarizeChild } from "@/lib/attendance-stats";
import { eventTypeColors } from "@/lib/calendar-colors";
import { pickColor } from "@/lib/colors";
import type { PublicUser } from "@/lib/password";
import type { SessionClaims } from "@/lib/session";
import type {
  AgeGroup,
  AttendanceRecord,
  AttendanceStatus,
  CalendarEvent,
  Child,
  Holiday,
  LessonPlan,
  LibraryFolder,
  MediaItem,
  DocumentItem,
  Notification,
  Post,
  RosterEntry,
  SchoolClass,
} from "@/lib/types";

/**
 * Tools DWKY AI can call. Every write goes through the app's own API route handlers
 * (called in-process with the signed-in user's own session token), so roles,
 * validation, audit-log entries and notifications behave exactly as if the user had
 * clicked the button themselves — the AI never gets more power than its user has.
 */

export class ToolError extends Error {}

interface Snapshot {
  currentUser: PublicUser;
  users: PublicUser[];
  ageGroups: AgeGroup[];
  classes: SchoolClass[];
  children: Child[];
  lessonPlans: LessonPlan[];
  posts: Post[];
  mediaItems: MediaItem[];
  documentItems: DocumentItem[];
  calendarEvents: CalendarEvent[];
  holidays: Holiday[];
  rosterEntries: RosterEntry[];
  notifications: Notification[];
  libraryFolders: LibraryFolder[];
}

export interface ToolRuntime {
  token: string;
  claims: SessionClaims;
  snapshot(): Promise<Snapshot>;
  invalidate(): void;
}

export function createToolRuntime(token: string, claims: SessionClaims): ToolRuntime {
  let cached: Snapshot | null = null;
  return {
    token,
    claims,
    async snapshot() {
      if (!cached) cached = await call<Snapshot>(bootstrapGET as RouteFn, token, "GET", "/api/data/bootstrap");
      return cached;
    },
    invalidate() {
      cached = null;
    },
  };
}

type RouteFn = (request: Request, ctx: unknown) => Promise<Response>;

async function call<T = Record<string, unknown>>(
  handler: unknown,
  token: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const request = new Request(`https://dwky-connect.internal${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await (handler as RouteFn)(request, params ? { params: Promise.resolve(params) } : undefined);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ToolError(typeof data?.message === "string" ? data.message : "That action failed.");
  return data as T;
}

// ---------------------------------------------------------------- argument helpers

type Args = Record<string, unknown>;

function str(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function needStr(args: Args, key: string): string {
  const v = str(args, key);
  if (!v) throw new ToolError(`"${key}" is required.`);
  return v;
}
function strList(args: Args, key: string): string[] | undefined {
  const v = args[key];
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
}

/** Finds a record by exact id, then by exact name, then by a unique partial name — so the model can pass "Little Lambs" or an id interchangeably. */
function pick<T extends { id: string }>(items: T[], value: string, label: (item: T) => string, kind: string): T {
  const byId = items.find((i) => i.id === value);
  if (byId) return byId;
  const lower = value.toLowerCase();
  const exact = items.filter((i) => label(i).toLowerCase() === lower);
  if (exact.length === 1) return exact[0];
  const partial = items.filter((i) => label(i).toLowerCase().includes(lower));
  if (partial.length === 1) return partial[0];
  const candidates = exact.length > 1 ? exact : partial;
  if (candidates.length > 1) {
    throw new ToolError(`More than one ${kind} matches "${value}": ${candidates.slice(0, 6).map(label).join("; ")}. Ask the user which one.`);
  }
  throw new ToolError(`No ${kind} found matching "${value}".`);
}

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

function assertIsoDate(value: string, key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ToolError(`"${key}" must be a date in YYYY-MM-DD format.`);
  return value;
}

// ---------------------------------------------------------------- tool registry

interface ToolDef {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  /** Changes data (as opposed to just reading it) — recorded in the action log. */
  write: boolean;
  /** Needs the user's explicit Confirm click before it runs. */
  destructive?: boolean;
  run(args: Args, rt: ToolRuntime): Promise<{ summary: string; result: unknown }>;
  /** Plain-language description of what the call will do — shown on the confirmation card. */
  describe?(args: Args, rt: ToolRuntime): Promise<string>;
}

const s = (description: string) => ({ type: "string", description });
const sList = (description: string) => ({ type: "array", items: { type: "string" }, description });
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object" as const, properties, required });

const EVENT_TYPES = ["Sunday Lesson", "Teacher Meeting", "Children Event", "Holiday Program", "VBS", "Birthday", "Parent Meeting"] as const;
const POST_TYPES = ["Update", "Announcement", "Devotional", "Prayer"] as const;
const MILESTONE_CATEGORIES = ["Memory Verse", "Bible Knowledge", "Participation", "Prayer", "Kindness", "Achievement"] as const;

const className = (snap: Snapshot, id: string) => snap.classes.find((c) => c.id === id)?.name ?? "Unknown class";
const userName = (snap: Snapshot, id: string) => snap.users.find((u) => u.id === id)?.name ?? "Someone";
const ageGroupName = (snap: Snapshot, id: string) => snap.ageGroups.find((a) => a.id === id)?.name ?? "";

function truncate(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const LESSON_TEXT_FIELDS = ["passage", "theme", "memoryVerse", "openingActivity", "bibleStory", "craftActivity", "closingPrayer", "homework"] as const;
const LESSON_LIST_FIELDS = ["objectives", "discussionQuestions", "worshipSongs"] as const;

const lessonProps = {
  passage: s("Bible passage, e.g. 'John 3:16-21'."),
  theme: s("The lesson theme."),
  memoryVerse: s("Memory verse reference and short text."),
  date: s("Lesson date, YYYY-MM-DD."),
  objectives: sList("Learning objectives."),
  openingActivity: s("Opening activity / icebreaker."),
  bibleStory: s("The Bible story or main teaching content."),
  discussionQuestions: sList("Discussion questions."),
  craftActivity: s("Craft or hands-on activity."),
  worshipSongs: sList("Worship songs."),
  closingPrayer: s("Closing prayer."),
  homework: s("Take-home activity."),
};

function lessonFieldsFrom(args: Args): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of LESSON_TEXT_FIELDS) if (typeof args[f] === "string") out[f] = args[f];
  for (const f of LESSON_LIST_FIELDS) {
    const list = strList(args, f);
    if (list) out[f] = list;
  }
  if (str(args, "date")) out.date = assertIsoDate(str(args, "date")!, "date");
  return out;
}

// ---------------------------------------------------------------- attendance helpers

/** The class the user means: the one they named, else their own; admins without a class must say which. */
function attendanceClassFor(args: Args, snap: Snapshot): SchoolClass {
  const asked = str(args, "class");
  if (asked) return pick(snap.classes, asked, (c) => c.name, "class");
  const mine = snap.currentUser.classId ? snap.classes.find((c) => c.id === snap.currentUser.classId) : undefined;
  if (mine) return mine;
  throw new ToolError(`Which class? You are not assigned to one. Classes: ${snap.classes.map((c) => c.name).join(", ") || "none yet"}.`);
}

function attendanceDateFrom(args: Args): string {
  const given = str(args, "date");
  return given ? assertIsoDate(given, "date") : todayIso();
}

/** Resolves typed names to children of one class; refuses (with a precise message) rather than guessing. */
function resolveChildNames(lists: Record<string, string[]>, kids: Child[], className: string): Record<string, Set<string>> {
  const people = kids.map((k) => ({ id: k.id, name: k.name }));
  const problems: string[] = [];
  const out: Record<string, Set<string>> = {};
  for (const [label, names] of Object.entries(lists)) {
    const result = matchNames(splitNameList(names), people);
    out[label] = new Set(result.matched.keys());
    for (const a of result.ambiguous) problems.push(`"${a.query}" could be ${a.candidates.join(" or ")}`);
    if (result.unmatched.length > 0) {
      problems.push(`no child in ${className} matches ${result.unmatched.map((n) => `"${n}"`).join(", ")}`);
    }
  }
  if (problems.length > 0) {
    throw new ToolError(
      `Nothing was saved. ${problems.join("; ")}. Ask the user to clarify (a name that isn't in the class may be a visitor — pass it in visitorNames). Children in ${className}: ${kids.map((k) => k.name).join(", ")}.`
    );
  }
  const seen = new Map<string, string>();
  for (const [label, ids] of Object.entries(out)) {
    for (const id of ids) {
      const earlier = seen.get(id);
      if (earlier && earlier !== label) {
        throw new ToolError(`${kids.find((k) => k.id === id)?.name} is listed as both ${earlier} and ${label}. Nothing was saved.`);
      }
      seen.set(id, label);
    }
  }
  return out;
}

function namesOf(kids: Child[], ids: string[]): string[] {
  return ids.map((id) => kids.find((k) => k.id === id)?.name).filter((n): n is string => !!n);
}

const tools: ToolDef[] = [
  // ------------------------------------------------------------ reading
  {
    name: "get_my_profile",
    description: "Get the signed-in user's own profile: name, role (admin or teacher), title, assigned class.",
    parameters: schema({}),
    write: false,
    async run(_args, rt) {
      const snap = await rt.snapshot();
      const u = snap.currentUser;
      return {
        summary: "Read profile",
        result: { id: u.id, name: u.name, role: u.role, title: u.title, class: u.classId ? className(snap, u.classId) : null, bio: u.bio ?? null, username: u.username ?? null },
      };
    },
  },
  {
    name: "list_age_groups",
    description: "List the age groups (name and age range).",
    parameters: schema({}),
    write: false,
    async run(_args, rt) {
      const snap = await rt.snapshot();
      return { summary: "Listed age groups", result: snap.ageGroups.map((a) => ({ id: a.id, name: a.name, range: a.range })) };
    },
  },
  {
    name: "list_classes",
    description: "List all classes with their age group, room, teachers and number of children.",
    parameters: schema({}),
    write: false,
    async run(_args, rt) {
      const snap = await rt.snapshot();
      return {
        summary: "Listed classes",
        result: snap.classes.map((c) => ({
          id: c.id,
          name: c.name,
          ageGroup: ageGroupName(snap, c.ageGroupId),
          room: c.room,
          teachers: c.teacherIds.map((id) => userName(snap, id)),
          childCount: c.childCount,
        })),
      };
    },
  },
  {
    name: "list_teachers",
    description: "List the people with an account (teachers and administrators): name, role, title and class.",
    parameters: schema({}),
    write: false,
    async run(_args, rt) {
      const snap = await rt.snapshot();
      return {
        summary: "Listed teachers",
        result: snap.users
          .filter((u) => u.status === "active")
          .map((u) => ({ id: u.id, name: u.name, role: u.role, title: u.title, class: u.classId ? className(snap, u.classId) : null })),
      };
    },
  },
  {
    name: "list_children",
    description: "List children (portfolios). Optionally filter by class and/or a name search. Returns summaries; use get_child for full details.",
    parameters: schema({ class: s("Class name or id to filter by."), search: s("Part of the child's name.") }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      let list = snap.children;
      if (str(args, "class")) {
        const cls = pick(snap.classes, str(args, "class")!, (c) => c.name, "class");
        list = list.filter((c) => c.classId === cls.id);
      }
      if (str(args, "search")) list = list.filter((c) => c.name.toLowerCase().includes(str(args, "search")!.toLowerCase()));
      return {
        summary: "Listed children",
        result: list.map((c) => ({ id: c.id, name: c.name, age: c.age, birthday: c.birthday, class: className(snap, c.classId) })),
      };
    },
  },
  {
    name: "get_child",
    description: "Get one child's full portfolio: guardians, allergies, address, milestones and teacher observations.",
    parameters: schema({ child: s("Child's name or id.") }, ["child"]),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const c = pick(snap.children, needStr(args, "child"), (x) => x.name, "child");
      return {
        summary: `Read ${c.name}'s portfolio`,
        result: {
          id: c.id,
          name: c.name,
          age: c.age,
          birthday: c.birthday,
          class: className(snap, c.classId),
          teacher: c.teacherId ? userName(snap, c.teacherId) : null,
          enrollmentDate: c.enrollmentDate,
          guardians: c.guardians,
          address: c.address ?? null,
          allergies: c.allergies ?? null,
          milestones: c.milestones.map((m) => ({ label: m.label, category: m.category, date: m.date, note: m.note })),
          observations: c.observations.slice(0, 10).map((o) => ({ date: o.date, author: userName(snap, o.authorId), note: o.note, tag: o.tag })),
        },
      };
    },
  },
  {
    name: "list_lessons",
    description: "List lesson plans (summaries). Filter by status, age group or a title search. Use get_lesson for the full content.",
    parameters: schema({
      status: { type: "string", enum: ["draft", "published"], description: "Filter by status." },
      ageGroup: s("Age group name or id."),
      search: s("Part of the title, theme or passage."),
    }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      let list = snap.lessonPlans;
      if (str(args, "status")) list = list.filter((l) => l.status === args.status);
      if (str(args, "ageGroup")) {
        const ag = pick(snap.ageGroups, str(args, "ageGroup")!, (a) => a.name, "age group");
        list = list.filter((l) => l.ageGroupId === ag.id);
      }
      const q = str(args, "search")?.toLowerCase();
      if (q) list = list.filter((l) => [l.title, l.theme, l.passage].some((f) => f.toLowerCase().includes(q)));
      return {
        summary: "Listed lessons",
        result: list.slice(0, 40).map((l) => ({
          id: l.id,
          title: l.title,
          passage: l.passage,
          theme: l.theme,
          ageGroup: ageGroupName(snap, l.ageGroupId),
          date: l.date,
          status: l.status,
          author: userName(snap, l.authorId),
        })),
      };
    },
  },
  {
    name: "get_lesson",
    description: "Get the full content of one lesson plan.",
    parameters: schema({ lesson: s("Lesson title or id.") }, ["lesson"]),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const l = pick(snap.lessonPlans, needStr(args, "lesson"), (x) => x.title, "lesson");
      const { id, title, passage, theme, memoryVerse, date, status, objectives, openingActivity, bibleStory, discussionQuestions, craftActivity, worshipSongs, closingPrayer, homework } = l;
      return {
        summary: `Read lesson "${l.title}"`,
        result: { id, title, passage, theme, memoryVerse, date, status, ageGroup: ageGroupName(snap, l.ageGroupId), objectives, openingActivity, bibleStory, discussionQuestions, craftActivity, worshipSongs, closingPrayer, homework },
      };
    },
  },
  {
    name: "list_events",
    description: "List calendar events, optionally between two dates (YYYY-MM-DD) or matching a search. Sorted by date.",
    parameters: schema({ fromDate: s("Earliest date, YYYY-MM-DD."), toDate: s("Latest date, YYYY-MM-DD."), search: s("Part of the title.") }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const from = str(args, "fromDate");
      const to = str(args, "toDate");
      const q = str(args, "search")?.toLowerCase();
      const list = snap.calendarEvents
        .filter((e) => (!from || e.date >= from) && (!to || e.date <= to) && (!q || e.title.toLowerCase().includes(q)))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 60);
      return {
        summary: "Listed events",
        result: list.map((e) => ({ id: e.id, title: e.title, date: e.date, endDate: e.endDate, time: e.time, type: e.type, location: e.location, description: e.description })),
      };
    },
  },
  {
    name: "list_holidays",
    description: "List school vacations and national holidays.",
    parameters: schema({ schoolYear: s("e.g. '2025-2026'.") }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const year = str(args, "schoolYear");
      const list = snap.holidays.filter((h) => !year || h.schoolYear === year).sort((a, b) => a.startDate.localeCompare(b.startDate));
      return {
        summary: "Listed holidays",
        result: list.map((h) => ({ id: h.id, name: h.name, type: h.type, startDate: h.startDate, endDate: h.endDate, provisional: h.provisional, schoolYear: h.schoolYear })),
      };
    },
  },
  {
    name: "list_roster",
    description: "List Sunday School & Youth roster entries (who teaches when, theme, preacher), optionally between two dates.",
    parameters: schema({ fromDate: s("Earliest date, YYYY-MM-DD."), toDate: s("Latest date, YYYY-MM-DD.") }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const from = str(args, "fromDate");
      const to = str(args, "toDate");
      const list = snap.rosterEntries.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)).sort((a, b) => a.date.localeCompare(b.date));
      return {
        summary: "Listed roster",
        result: list.slice(0, 40).map((r) => ({
          id: r.id,
          date: r.date,
          sundaySchool: r.sundaySchoolUserIds.map((id) => userName(snap, id)),
          teenClub: r.teenClubUserIds.map((id) => userName(snap, id)),
          theme: r.theme,
          serviceType: r.serviceType,
          preacher: r.preacher,
          notes: r.notes,
        })),
      };
    },
  },
  {
    name: "list_posts",
    description: "List recent posts from the Updates feed (newest first), with ids so you can comment/react.",
    parameters: schema({ type: { type: "string", enum: [...POST_TYPES], description: "Filter by post type." }, limit: { type: "number", description: "Max posts (default 10)." } }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const limit = typeof args.limit === "number" ? Math.min(Math.max(1, Math.floor(args.limit)), 30) : 10;
      const list = snap.posts
        .filter((p) => !str(args, "type") || p.type === args.type)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
      return {
        summary: "Listed posts",
        result: list.map((p) => ({
          id: p.id,
          type: p.type,
          author: userName(snap, p.authorId),
          date: p.date.slice(0, 10),
          content: truncate(p.content, 300),
          pinned: p.pinned,
          comments: p.comments.length,
          reactions: p.reactions.map((r) => `${r.emoji} ${r.userIds.length}`),
          poll: p.poll ? { question: p.poll.question, options: p.poll.options.map((o) => `${o.text} (${o.votes})`) } : undefined,
        })),
      };
    },
  },
  {
    name: "list_library",
    description: "List the Documents or Media library: its folders and files (with ids). Optionally filter by folder name or search text.",
    parameters: schema(
      { library: { type: "string", enum: ["documents", "media"], description: "Which library." }, folder: s("Folder name or id."), search: s("Part of the file name.") },
      ["library"]
    ),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const library = args.library === "media" ? "media" : "documents";
      const folders = snap.libraryFolders.filter((f) => f.library === library);
      const folder = str(args, "folder") ? pick(folders, str(args, "folder")!, (f) => f.name, "folder") : null;
      const q = str(args, "search")?.toLowerCase();
      const files = (library === "documents" ? snap.documentItems : snap.mediaItems)
        .filter((f) => (folder ? f.folderId === folder.id : true) && (!q || f.name.toLowerCase().includes(q)))
        .slice(0, 60);
      return {
        summary: `Listed ${library}`,
        result: {
          folders: folders.map((f) => ({ id: f.id, name: f.name })),
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            folder: f.folderId ? folders.find((x) => x.id === f.folderId)?.name ?? null : null,
            size: f.size,
            uploadedBy: userName(snap, f.uploadedBy),
            uploadedAt: f.uploadedAt,
          })),
        },
      };
    },
  },
  {
    name: "list_notifications",
    description: "List the user's current notifications.",
    parameters: schema({}),
    write: false,
    async run(_args, rt) {
      const snap = await rt.snapshot();
      return {
        summary: "Listed notifications",
        result: snap.notifications.slice(0, 20).map((n) => ({ title: n.title, description: n.description, date: n.date.slice(0, 10), read: n.read })),
      };
    },
  },

  // ------------------------------------------------------------ calendar & holidays
  {
    name: "create_event",
    description: "Add an event to the calendar.",
    parameters: schema(
      {
        title: s("Event title."),
        date: s("Date, YYYY-MM-DD."),
        type: { type: "string", enum: [...EVENT_TYPES], description: "Event type." },
        time: s("Optional time, 24h HH:MM."),
        endDate: s("Optional end date for multi-day events, YYYY-MM-DD."),
        location: s("Optional location."),
        description: s("Optional description."),
      },
      ["title", "date", "type"]
    ),
    write: true,
    async run(args, rt) {
      const type = args.type as CalendarEvent["type"];
      if (!EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) throw new ToolError(`"type" must be one of: ${EVENT_TYPES.join(", ")}.`);
      const body = {
        title: needStr(args, "title"),
        date: assertIsoDate(needStr(args, "date"), "date"),
        type,
        color: eventTypeColors[type],
        ...(str(args, "time") ? { time: str(args, "time") } : {}),
        ...(str(args, "endDate") ? { endDate: assertIsoDate(str(args, "endDate")!, "endDate") } : {}),
        ...(str(args, "location") ? { location: str(args, "location") } : {}),
        ...(str(args, "description") ? { description: str(args, "description") } : {}),
      };
      const event = await call<CalendarEvent>(eventsPOST, rt.token, "POST", "/api/events", body);
      return { summary: `Added event "${event.title}" on ${event.date}`, result: { id: event.id } };
    },
  },
  {
    name: "update_event",
    description:
      "Edit a calendar event's title, date, time, type, location or description. Only the fields you pass change; pass an empty string to clear time, endDate, location or description. Only administrators or the event's creator may edit it, and roster events must be changed on the Roster page.",
    parameters: schema(
      {
        event: s("Event title or id (use list_events to find it)."),
        title: s("New title."),
        date: s("New date, YYYY-MM-DD."),
        type: { type: "string", enum: [...EVENT_TYPES], description: "New event type." },
        time: s("New time HH:MM, or empty string to clear."),
        endDate: s("New end date YYYY-MM-DD, or empty string to clear."),
        location: s("New location, or empty string to clear."),
        description: s("New description, or empty string to clear."),
      },
      ["event"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const event = pick(snap.calendarEvents, needStr(args, "event"), (e) => e.title, "event");
      const body: Record<string, unknown> = {};
      if (str(args, "title")) body.title = str(args, "title");
      if (str(args, "date")) body.date = assertIsoDate(str(args, "date")!, "date");
      if (str(args, "type")) {
        if (!EVENT_TYPES.includes(args.type as (typeof EVENT_TYPES)[number])) throw new ToolError(`"type" must be one of: ${EVENT_TYPES.join(", ")}.`);
        body.type = args.type;
      }
      for (const key of ["time", "endDate", "location", "description"] as const) {
        if (typeof args[key] === "string") body[key] = key === "endDate" && args[key] ? assertIsoDate(args[key] as string, key) : args[key];
      }
      if (Object.keys(body).length === 0) throw new ToolError("Nothing to change — pass at least one field to update.");
      const updated = await call<CalendarEvent>(eventPATCH, rt.token, "PATCH", `/api/events/${event.id}`, body, { id: event.id });
      return { summary: `Updated event "${updated.title}" (${updated.date})`, result: { id: updated.id } };
    },
  },
  {
    name: "delete_event",
    description:
      "Delete a calendar event. Only administrators or the event's creator may delete it; roster events must be removed on the Roster page. The user must confirm before this runs.",
    parameters: schema({ event: s("Event title or id (use list_events to find it).") }, ["event"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const e = pick((await rt.snapshot()).calendarEvents, needStr(args, "event"), (x) => x.title, "event");
      return `Delete the event "${e.title}" on ${e.date}`;
    },
    async run(args, rt) {
      const e = pick((await rt.snapshot()).calendarEvents, needStr(args, "event"), (x) => x.title, "event");
      await call(eventDELETE, rt.token, "DELETE", `/api/events/${e.id}`, undefined, { id: e.id });
      return { summary: `Deleted event "${e.title}" on ${e.date}`, result: { ok: true } };
    },
  },
  {
    name: "create_holiday",
    description: "Add a school vacation or national holiday.",
    parameters: schema(
      {
        name: s("Holiday name (keep Dutch names as published)."),
        type: { type: "string", enum: ["school_vacation", "national_holiday"] },
        startDate: s("First day, YYYY-MM-DD."),
        endDate: s("Last day, YYYY-MM-DD (same as startDate for a single day)."),
        schoolYear: s("School year, e.g. '2025-2026'."),
        provisional: { type: "boolean", description: "True if the date is not yet confirmed." },
      },
      ["name", "type", "startDate", "schoolYear"]
    ),
    write: true,
    async run(args, rt) {
      const startDate = assertIsoDate(needStr(args, "startDate"), "startDate");
      const body = {
        name: needStr(args, "name"),
        type: args.type,
        startDate,
        endDate: str(args, "endDate") ? assertIsoDate(str(args, "endDate")!, "endDate") : startDate,
        schoolYear: needStr(args, "schoolYear"),
        provisional: args.provisional === true,
      };
      const h = await call<Holiday>(holidaysPOST, rt.token, "POST", "/api/holidays", body);
      return { summary: `Added holiday "${h.name}" (${h.startDate}${h.endDate !== h.startDate ? ` – ${h.endDate}` : ""})`, result: { id: h.id } };
    },
  },
  {
    name: "update_holiday",
    description: "Change an existing holiday's name, dates, type, school year or provisional flag.",
    parameters: schema(
      {
        holiday: s("Holiday name or id."),
        name: s("New name."),
        type: { type: "string", enum: ["school_vacation", "national_holiday"] },
        startDate: s("New first day, YYYY-MM-DD."),
        endDate: s("New last day, YYYY-MM-DD."),
        schoolYear: s("New school year."),
        provisional: { type: "boolean" },
      },
      ["holiday"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const h = pick(snap.holidays, needStr(args, "holiday"), (x) => x.name, "holiday");
      const body: Record<string, unknown> = {};
      for (const k of ["name", "type", "schoolYear"] as const) if (str(args, k)) body[k] = str(args, k);
      for (const k of ["startDate", "endDate"] as const) if (str(args, k)) body[k] = assertIsoDate(str(args, k)!, k);
      if (typeof args.provisional === "boolean") body.provisional = args.provisional;
      await call(holidayPATCH, rt.token, "PATCH", `/api/holidays/${h.id}`, body, { id: h.id });
      return { summary: `Updated holiday "${h.name}"`, result: { id: h.id } };
    },
  },
  {
    name: "delete_holiday",
    description: "Delete a holiday. The user must confirm before this runs.",
    parameters: schema({ holiday: s("Holiday name or id.") }, ["holiday"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const h = pick((await rt.snapshot()).holidays, needStr(args, "holiday"), (x) => x.name, "holiday");
      return `Delete the holiday "${h.name}" (${h.startDate}${h.endDate !== h.startDate ? ` – ${h.endDate}` : ""})`;
    },
    async run(args, rt) {
      const h = pick((await rt.snapshot()).holidays, needStr(args, "holiday"), (x) => x.name, "holiday");
      await call(holidayDELETE, rt.token, "DELETE", `/api/holidays/${h.id}`, undefined, { id: h.id });
      return { summary: `Deleted holiday "${h.name}"`, result: { ok: true } };
    },
  },

  // ------------------------------------------------------------ lessons
  {
    name: "create_lesson",
    description: "Create a lesson plan (saved as a draft unless status is 'published'). Fill in every section you can from the user's request.",
    parameters: schema(
      { title: s("Lesson title."), ageGroup: s("Age group name or id."), status: { type: "string", enum: ["draft", "published"] }, ...lessonProps },
      ["title", "ageGroup"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const ag = pick(snap.ageGroups, needStr(args, "ageGroup"), (a) => a.name, "age group");
      const body = {
        title: needStr(args, "title"),
        passage: "",
        theme: "",
        memoryVerse: "",
        ageGroupId: ag.id,
        date: todayIso(),
        status: args.status === "published" ? "published" : "draft",
        objectives: [],
        openingActivity: "",
        bibleStory: "",
        discussionQuestions: [],
        craftActivity: "",
        worshipSongs: [],
        closingPrayer: "",
        homework: "",
        attachments: [],
        coverColor: pickColor(snap.lessonPlans.length),
        ...lessonFieldsFrom(args),
      };
      const lesson = await call<LessonPlan>(lessonsPOST, rt.token, "POST", "/api/lessons", body);
      return { summary: `Created ${lesson.status} lesson "${lesson.title}"`, result: { id: lesson.id, link: `/lessons/${lesson.id}` } };
    },
  },
  {
    name: "update_lesson",
    description: "Edit an existing lesson plan. Only the fields you pass are changed.",
    parameters: schema(
      { lesson: s("Lesson title or id."), title: s("New title."), ageGroup: s("New age group."), status: { type: "string", enum: ["draft", "published"] }, ...lessonProps },
      ["lesson"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const lesson = pick(snap.lessonPlans, needStr(args, "lesson"), (l) => l.title, "lesson");
      const body: Record<string, unknown> = { ...lessonFieldsFrom(args) };
      if (str(args, "title")) body.title = str(args, "title");
      if (str(args, "status")) body.status = args.status === "published" ? "published" : "draft";
      if (str(args, "ageGroup")) body.ageGroupId = pick(snap.ageGroups, str(args, "ageGroup")!, (a) => a.name, "age group").id;
      await call(lessonPATCH, rt.token, "PATCH", `/api/lessons/${lesson.id}`, body, { id: lesson.id });
      return { summary: `Updated lesson "${lesson.title}"`, result: { id: lesson.id, link: `/lessons/${lesson.id}` } };
    },
  },

  // ------------------------------------------------------------ updates feed
  {
    name: "create_post",
    description: "Publish a post to the Updates feed (visible to all teachers; also emails them). Prayer posts become prayer requests. Optionally attach a poll.",
    parameters: schema(
      {
        type: { type: "string", enum: [...POST_TYPES] },
        content: s("The post text."),
        pollQuestion: s("Optional poll question."),
        pollOptions: sList("Poll options (2 or more) — required if pollQuestion is set."),
      },
      ["type", "content"]
    ),
    write: true,
    async run(args, rt) {
      const options = strList(args, "pollOptions");
      const poll =
        str(args, "pollQuestion") && options && options.length >= 2
          ? { question: str(args, "pollQuestion"), options: options.map((text) => ({ text, votes: 0 })), votesByUser: {} }
          : undefined;
      const post = await call<Post>(postsPOST, rt.token, "POST", "/api/posts", {
        type: POST_TYPES.includes(args.type as (typeof POST_TYPES)[number]) ? args.type : "Update",
        content: needStr(args, "content"),
        ...(poll ? { poll } : {}),
      });
      return { summary: `Posted a ${post.type.toLowerCase()} to Updates`, result: { id: post.id } };
    },
  },
  {
    name: "comment_on_post",
    description: "Add a comment to a post (use list_posts to find the post id).",
    parameters: schema({ postId: s("Post id."), text: s("Comment text.") }, ["postId", "text"]),
    write: true,
    async run(args, rt) {
      const postId = needStr(args, "postId");
      await call(postPATCH, rt.token, "PATCH", `/api/posts/${postId}`, { action: "comment", text: needStr(args, "text") }, { id: postId });
      return { summary: "Added a comment", result: { ok: true } };
    },
  },
  {
    name: "react_to_post",
    description: "Toggle an emoji reaction on a post (calling again with the same emoji removes it).",
    parameters: schema({ postId: s("Post id."), emoji: s("A single emoji, e.g. '❤️' or '🙏'.") }, ["postId", "emoji"]),
    write: true,
    async run(args, rt) {
      const postId = needStr(args, "postId");
      await call(postPATCH, rt.token, "PATCH", `/api/posts/${postId}`, { action: "react", emoji: needStr(args, "emoji") }, { id: postId });
      return { summary: `Reacted ${needStr(args, "emoji")}`, result: { ok: true } };
    },
  },
  {
    name: "mark_prayed_for_request",
    description: "Toggle 'I prayed for this' on a prayer-request post.",
    parameters: schema({ postId: s("Post id.") }, ["postId"]),
    write: true,
    async run(args, rt) {
      const postId = needStr(args, "postId");
      await call(postPATCH, rt.token, "PATCH", `/api/posts/${postId}`, { action: "pray" }, { id: postId });
      return { summary: "Marked as prayed for", result: { ok: true } };
    },
  },
  {
    name: "vote_in_poll",
    description: "Vote in a poll attached to a post (one vote per person). optionIndex is 0-based.",
    parameters: schema({ postId: s("Post id."), optionIndex: { type: "number", description: "0-based index of the option." } }, ["postId", "optionIndex"]),
    write: true,
    async run(args, rt) {
      const postId = needStr(args, "postId");
      await call(postPATCH, rt.token, "PATCH", `/api/posts/${postId}`, { action: "vote", optionIndex: Number(args.optionIndex) }, { id: postId });
      return { summary: "Voted in the poll", result: { ok: true } };
    },
  },
  {
    name: "toggle_pin_post",
    description: "Pin or unpin a post (administrators only).",
    parameters: schema({ postId: s("Post id.") }, ["postId"]),
    write: true,
    async run(args, rt) {
      const postId = needStr(args, "postId");
      await call(postPATCH, rt.token, "PATCH", `/api/posts/${postId}`, { action: "pin" }, { id: postId });
      return { summary: "Toggled the post's pin", result: { ok: true } };
    },
  },
  {
    name: "delete_post",
    description: "Delete a post (administrators only). The user must confirm before this runs.",
    parameters: schema({ postId: s("Post id.") }, ["postId"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const post = (await rt.snapshot()).posts.find((p) => p.id === needStr(args, "postId"));
      return post ? `Delete the post: "${truncate(post.content, 90)}"` : "Delete a post";
    },
    async run(args, rt) {
      await call(postsDELETE, rt.token, "DELETE", `/api/posts?id=${encodeURIComponent(needStr(args, "postId"))}`);
      return { summary: "Deleted the post", result: { ok: true } };
    },
  },

  // ------------------------------------------------------------ children
  {
    name: "create_child",
    description: "Create a child portfolio.",
    parameters: schema(
      {
        name: s("Child's full name."),
        class: s("Class name or id."),
        age: { type: "number", description: "Age in years." },
        birthday: s("Birthday, YYYY-MM-DD."),
        teacher: s("Teacher name or id."),
        address: s("Home address."),
        allergies: s("Allergies / medical notes."),
        guardians: {
          type: "array",
          description: "Parents or guardians.",
          items: schema({ name: s("Name"), relation: s("e.g. Mother"), phone: s("Phone"), email: s("Email") }, ["name"]),
        },
      },
      ["name", "class"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const cls = pick(snap.classes, needStr(args, "class"), (c) => c.name, "class");
      const teacher = str(args, "teacher") ? pick(snap.users, str(args, "teacher")!, (u) => u.name, "teacher") : undefined;
      const guardians = Array.isArray(args.guardians)
        ? (args.guardians as Args[]).map((g) => ({ name: str(g, "name") ?? "", relation: str(g, "relation") ?? "", phone: str(g, "phone") ?? "", email: str(g, "email") ?? "" })).filter((g) => g.name)
        : [];
      const child = await call<Child>(childrenPOST, rt.token, "POST", "/api/children", {
        name: needStr(args, "name"),
        classId: cls.id,
        teacherId: teacher?.id,
        age: typeof args.age === "number" ? args.age : 0,
        birthday: str(args, "birthday") ?? "",
        address: str(args, "address"),
        allergies: str(args, "allergies"),
        guardians,
      });
      return { summary: `Added ${child.name} to ${cls.name}`, result: { id: child.id, link: `/children/${child.id}` } };
    },
  },
  {
    name: "add_child_observation",
    description: "Add a teacher observation note to a child's portfolio.",
    parameters: schema({ child: s("Child's name or id."), note: s("The observation."), tag: s("Optional short tag.") }, ["child", "note"]),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const child = pick(snap.children, needStr(args, "child"), (c) => c.name, "child");
      await call(childRecordsPOST, rt.token, "POST", `/api/children/${child.id}/records`, { kind: "observation", note: needStr(args, "note"), tag: str(args, "tag") }, { id: child.id });
      return { summary: `Added an observation to ${child.name}`, result: { ok: true } };
    },
  },
  {
    name: "add_child_milestone",
    description: "Record a spiritual milestone for a child (memory verse learned, etc.).",
    parameters: schema(
      {
        child: s("Child's name or id."),
        label: s("What was achieved."),
        category: { type: "string", enum: [...MILESTONE_CATEGORIES] },
        date: s("Date, YYYY-MM-DD (defaults to today)."),
        note: s("Optional note."),
      },
      ["child", "label", "category"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const child = pick(snap.children, needStr(args, "child"), (c) => c.name, "child");
      const category = MILESTONE_CATEGORIES.includes(args.category as (typeof MILESTONE_CATEGORIES)[number]) ? args.category : "Achievement";
      const item = { label: needStr(args, "label"), category, date: str(args, "date") ?? todayIso(), note: str(args, "note") };
      await call(childRecordsPOST, rt.token, "POST", `/api/children/${child.id}/records`, { kind: "milestone", item }, { id: child.id });
      return { summary: `Recorded milestone "${item.label}" for ${child.name}`, result: { ok: true } };
    },
  },
  {
    name: "delete_child",
    description: "Permanently delete a child's portfolio (administrators only). The user must confirm before this runs.",
    parameters: schema({ child: s("Child's name or id.") }, ["child"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const c = pick((await rt.snapshot()).children, needStr(args, "child"), (x) => x.name, "child");
      return `Permanently delete the portfolio of ${c.name}`;
    },
    async run(args, rt) {
      const c = pick((await rt.snapshot()).children, needStr(args, "child"), (x) => x.name, "child");
      await call(childDELETE, rt.token, "DELETE", `/api/children/${c.id}`, undefined, { id: c.id });
      return { summary: `Deleted the portfolio of ${c.name}`, result: { ok: true } };
    },
  },

  // ------------------------------------------------------------ classes & age groups
  {
    name: "create_class",
    description: "Create a class (administrators only).",
    parameters: schema({ name: s("Class name."), ageGroup: s("Age group name or id."), room: s("Room name/number.") }, ["name", "ageGroup", "room"]),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const ag = pick(snap.ageGroups, needStr(args, "ageGroup"), (a) => a.name, "age group");
      const cls = await call<SchoolClass>(classesPOST, rt.token, "POST", "/api/classes", { name: needStr(args, "name"), ageGroupId: ag.id, room: needStr(args, "room") });
      return { summary: `Created class "${cls.name}"`, result: { id: cls.id } };
    },
  },
  {
    name: "update_class",
    description: "Rename a class or change its age group or room (administrators only).",
    parameters: schema({ class: s("Class name or id."), name: s("New name."), ageGroup: s("New age group."), room: s("New room.") }, ["class"]),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const cls = pick(snap.classes, needStr(args, "class"), (c) => c.name, "class");
      const body: Record<string, unknown> = {};
      if (str(args, "name")) body.name = str(args, "name");
      if (str(args, "room")) body.room = str(args, "room");
      if (str(args, "ageGroup")) body.ageGroupId = pick(snap.ageGroups, str(args, "ageGroup")!, (a) => a.name, "age group").id;
      await call(classPATCH, rt.token, "PATCH", `/api/classes/${cls.id}`, body, { id: cls.id });
      return { summary: `Updated class "${cls.name}"`, result: { ok: true } };
    },
  },
  {
    name: "delete_class",
    description: "Delete an empty class (administrators only). The user must confirm before this runs.",
    parameters: schema({ class: s("Class name or id.") }, ["class"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const c = pick((await rt.snapshot()).classes, needStr(args, "class"), (x) => x.name, "class");
      return `Delete the class "${c.name}"`;
    },
    async run(args, rt) {
      const c = pick((await rt.snapshot()).classes, needStr(args, "class"), (x) => x.name, "class");
      await call(classDELETE, rt.token, "DELETE", `/api/classes/${c.id}`, undefined, { id: c.id });
      return { summary: `Deleted class "${c.name}"`, result: { ok: true } };
    },
  },
  {
    name: "create_age_group",
    description: "Create an age group (administrators only).",
    parameters: schema({ name: s("Name, e.g. 'Juniors'."), range: s("Age range, e.g. '8–10'.") }, ["name", "range"]),
    write: true,
    async run(args, rt) {
      const ag = await call<AgeGroup>(ageGroupsPOST, rt.token, "POST", "/api/age-groups", { name: needStr(args, "name"), range: needStr(args, "range") });
      return { summary: `Created age group "${ag.name}"`, result: { id: ag.id } };
    },
  },

  // ------------------------------------------------------------ roster
  {
    name: "create_roster_entry",
    description: "Add a Sunday School & Youth roster entry (administrators only). It also creates a linked calendar event.",
    parameters: schema(
      {
        date: s("Date, YYYY-MM-DD."),
        sundaySchoolTeachers: sList("Names (or ids) of the Sunday School teachers."),
        teenClubTeachers: sList("Names (or ids) of the Teen Club teachers."),
        theme: s("Theme."),
        serviceType: s("Service type."),
        preacher: s("Preacher."),
        liturgy: s("Liturgy."),
        musicalAccompaniment: s("Musical accompaniment."),
        notes: s("Notes."),
      },
      ["date"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const ids = (key: string) => (strList(args, key) ?? []).map((n) => pick(snap.users, n, (u) => u.name, "teacher").id);
      const res = await call<{ rosterEntry: RosterEntry }>(rosterPOST, rt.token, "POST", "/api/roster", {
        date: assertIsoDate(needStr(args, "date"), "date"),
        sundaySchoolUserIds: ids("sundaySchoolTeachers"),
        teenClubUserIds: ids("teenClubTeachers"),
        theme: str(args, "theme") ?? "",
        serviceType: str(args, "serviceType") ?? "",
        preacher: str(args, "preacher") ?? "",
        liturgy: str(args, "liturgy") ?? "",
        musicalAccompaniment: str(args, "musicalAccompaniment") ?? "",
        notes: str(args, "notes") ?? "",
      });
      return { summary: `Added roster entry for ${res.rosterEntry.date}`, result: { id: res.rosterEntry.id } };
    },
  },
  {
    name: "update_roster_entry",
    description: "Edit a roster entry (administrators only). Only the fields you pass are changed; teacher lists replace the old lists.",
    parameters: schema(
      {
        entry: s("Roster entry id or its date (YYYY-MM-DD)."),
        date: s("New date."),
        sundaySchoolTeachers: sList("Names (or ids) of the Sunday School teachers."),
        teenClubTeachers: sList("Names (or ids) of the Teen Club teachers."),
        theme: s("Theme."),
        serviceType: s("Service type."),
        preacher: s("Preacher."),
        liturgy: s("Liturgy."),
        musicalAccompaniment: s("Musical accompaniment."),
        notes: s("Notes."),
      },
      ["entry"]
    ),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const entry = pick(snap.rosterEntries, needStr(args, "entry"), (r) => r.date, "roster entry");
      const body: Record<string, unknown> = {};
      for (const k of ["theme", "serviceType", "preacher", "liturgy", "musicalAccompaniment", "notes"] as const) if (typeof args[k] === "string") body[k] = args[k];
      if (str(args, "date")) body.date = assertIsoDate(str(args, "date")!, "date");
      const resolve = (key: string) => strList(args, key)!.map((n) => pick(snap.users, n, (u) => u.name, "teacher").id);
      if (strList(args, "sundaySchoolTeachers")) body.sundaySchoolUserIds = resolve("sundaySchoolTeachers");
      if (strList(args, "teenClubTeachers")) body.teenClubUserIds = resolve("teenClubTeachers");
      await call(rosterPATCH, rt.token, "PATCH", `/api/roster/${entry.id}`, body, { id: entry.id });
      return { summary: `Updated roster entry for ${entry.date}`, result: { ok: true } };
    },
  },
  {
    name: "delete_roster_entry",
    description: "Delete a roster entry and its linked calendar event (administrators only). The user must confirm before this runs.",
    parameters: schema({ entry: s("Roster entry id or its date (YYYY-MM-DD).") }, ["entry"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const e = pick((await rt.snapshot()).rosterEntries, needStr(args, "entry"), (r) => r.date, "roster entry");
      return `Delete the roster entry for ${e.date}${e.theme ? ` ("${e.theme}")` : ""}`;
    },
    async run(args, rt) {
      const e = pick((await rt.snapshot()).rosterEntries, needStr(args, "entry"), (r) => r.date, "roster entry");
      await call(rosterDELETE, rt.token, "DELETE", `/api/roster/${e.id}`, undefined, { id: e.id });
      return { summary: `Deleted the roster entry for ${e.date}`, result: { ok: true } };
    },
  },

  // ------------------------------------------------------------ documents & media
  {
    name: "create_library_folder",
    description: "Create a folder in the Documents or Media library.",
    parameters: schema({ library: { type: "string", enum: ["documents", "media"] }, name: s("Folder name.") }, ["library", "name"]),
    write: true,
    async run(args, rt) {
      const library = args.library === "media" ? "media" : "documents";
      const folder = await call<LibraryFolder>(foldersPOST, rt.token, "POST", "/api/library-folders", { library, name: needStr(args, "name") });
      return { summary: `Created ${library} folder "${folder.name}"`, result: { id: folder.id } };
    },
  },
  {
    name: "rename_library_folder",
    description: "Rename a Documents/Media library folder.",
    parameters: schema({ library: { type: "string", enum: ["documents", "media"] }, folder: s("Folder name or id."), name: s("New name.") }, ["library", "folder", "name"]),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const library = args.library === "media" ? "media" : "documents";
      const folder = pick(snap.libraryFolders.filter((f) => f.library === library), needStr(args, "folder"), (f) => f.name, "folder");
      await call(folderPATCH, rt.token, "PATCH", `/api/library-folders/${folder.id}`, { name: needStr(args, "name") }, { id: folder.id });
      return { summary: `Renamed folder "${folder.name}" to "${needStr(args, "name")}"`, result: { ok: true } };
    },
  },
  {
    name: "delete_library_folder",
    description: "Delete a library folder. Its files are not deleted — they move back to the library root.",
    parameters: schema({ library: { type: "string", enum: ["documents", "media"] }, folder: s("Folder name or id.") }, ["library", "folder"]),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const library = args.library === "media" ? "media" : "documents";
      const folder = pick(snap.libraryFolders.filter((f) => f.library === library), needStr(args, "folder"), (f) => f.name, "folder");
      await call(folderDELETE, rt.token, "DELETE", `/api/library-folders/${folder.id}`, undefined, { id: folder.id });
      return { summary: `Deleted folder "${folder.name}" (its files moved to the root)`, result: { ok: true } };
    },
  },
  {
    name: "delete_document",
    description: "Delete a file from the Documents library (it goes to the Google Drive trash). The user must confirm before this runs.",
    parameters: schema({ document: s("File name or id.") }, ["document"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const d = pick((await rt.snapshot()).documentItems, needStr(args, "document"), (x) => x.name, "document");
      return `Delete the document "${d.name}"`;
    },
    async run(args, rt) {
      const d = pick((await rt.snapshot()).documentItems, needStr(args, "document"), (x) => x.name, "document");
      await call(documentDELETE, rt.token, "DELETE", `/api/documents/${d.id}`, undefined, { id: d.id });
      return { summary: `Deleted document "${d.name}"`, result: { ok: true } };
    },
  },
  {
    name: "delete_media",
    description: "Delete a file from the Media library (it goes to the Google Drive trash). The user must confirm before this runs.",
    parameters: schema({ item: s("File name or id.") }, ["item"]),
    write: true,
    destructive: true,
    async describe(args, rt) {
      const m = pick((await rt.snapshot()).mediaItems, needStr(args, "item"), (x) => x.name, "media file");
      return `Delete the media file "${m.name}"`;
    },
    async run(args, rt) {
      const m = pick((await rt.snapshot()).mediaItems, needStr(args, "item"), (x) => x.name, "media file");
      await call(mediaDELETE, rt.token, "DELETE", `/api/media/${m.id}`, undefined, { id: m.id });
      return { summary: `Deleted media file "${m.name}"`, result: { ok: true } };
    },
  },

  // ------------------------------------------------------------ attendance
  {
    name: "record_attendance",
    description:
      "Save a class's attendance register for a date. Give EITHER presentChildren (everyone in the class who is NOT listed is marked absent) OR absentChildren (everyone not listed is marked present). Use for messages like 'aanwezig vandaag: Anna, Ben, Chloë' or 'afwezig: Daan'. Names can be first names; ambiguous or unknown names make it stop without saving. Replaces any register already saved for that class and date.",
    parameters: schema({
      class: s("Class name or id. Omit to use the user's own class."),
      date: s("YYYY-MM-DD. Omit for today."),
      presentChildren: sList("Names of the children who were present — one name per item."),
      absentChildren: sList("Names of the children who were absent — one name per item."),
      excusedChildren: sList("Names of absent children whose absence was reported in advance (verontschuldigd/afgemeld/gemeld)."),
      visitors: { type: "number", description: "Number of visitors (children not on the class list)." },
      visitorNames: sList("Names of visitors, if the user gave them (counted, not stored as children)."),
      note: s("Optional note about the day."),
      confirmMostlyAbsent: { type: "boolean", description: "Set true only after the user confirmed that most of the class really was absent." },
    }),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const cls = attendanceClassFor(args, snap);
      const date = attendanceDateFrom(args);
      const kids = snap.children.filter((c) => c.classId === cls.id);
      if (kids.length === 0) throw new ToolError(`${cls.name} has no children yet.`);

      const present = strList(args, "presentChildren") ?? [];
      const absent = strList(args, "absentChildren") ?? [];
      const excused = strList(args, "excusedChildren") ?? [];
      if (present.length > 0 && absent.length > 0) throw new ToolError("Give either who was present or who was absent, not both.");
      if (present.length === 0 && absent.length === 0) throw new ToolError("Tell me who was present, or who was absent.");

      const resolved = resolveChildNames({ present, absent, excused }, kids, cls.name);
      const presentMode = present.length > 0;
      const marks: Record<string, AttendanceStatus> = {};
      for (const kid of kids) marks[kid.id] = presentMode ? "absent" : "present";
      for (const id of resolved.present) marks[id] = "present";
      for (const id of resolved.absent) marks[id] = "absent";
      for (const id of resolved.excused) marks[id] = "excused";

      const away = Object.values(marks).filter((m) => m !== "present").length;
      if (kids.length >= 4 && away / kids.length >= 0.75 && args.confirmMostlyAbsent !== true) {
        throw new ToolError(
          `Nothing was saved: that would mark ${away} of ${kids.length} children in ${cls.name} as not present. Ask the user to confirm this is right, then call again with confirmMostlyAbsent=true.`
        );
      }

      const visitorNames = strList(args, "visitorNames") ?? [];
      const visitors = visitorNames.length > 0 ? visitorNames.length : typeof args.visitors === "number" ? Math.max(0, Math.floor(args.visitors)) : 0;

      const before = await call<{ record: AttendanceRecord | null }>(attendanceGET, rt.token, "GET", `/api/attendance?classId=${encodeURIComponent(cls.id)}&date=${date}`);
      const { record } = await call<{ record: AttendanceRecord }>(attendancePUT, rt.token, "PUT", "/api/attendance", {
        classId: cls.id,
        date,
        marks,
        visitors,
        note: str(args, "note"),
      });

      const ids = (status: AttendanceStatus) => Object.entries(record.marks).filter(([, m]) => m === status).map(([id]) => id);
      const result = {
        class: cls.name,
        date,
        present: namesOf(kids, ids("present")),
        absent: namesOf(kids, ids("absent")),
        excused: namesOf(kids, ids("excused")),
        visitors: record.visitors,
        replacedExistingRegister: !!before.record,
      };
      const parts = [`${result.present.length} present`, `${result.absent.length} absent`];
      if (result.excused.length > 0) parts.push(`${result.excused.length} excused`);
      if (result.visitors > 0) parts.push(`${result.visitors} visitor${result.visitors === 1 ? "" : "s"}`);
      return { summary: `Recorded attendance for ${cls.name} on ${date}: ${parts.join(", ")}`, result };
    },
  },
  {
    name: "update_attendance",
    description:
      "Correct an attendance register that is already saved, changing only the children named (e.g. 'Hanna was toch aanwezig', 'Gijs is verontschuldigd'). Also updates the visitor count or note.",
    parameters: schema({
      class: s("Class name or id. Omit to use the user's own class."),
      date: s("YYYY-MM-DD. Omit for today."),
      present: sList("Children to mark present."),
      absent: sList("Children to mark absent."),
      excused: sList("Children to mark excused."),
      visitors: { type: "number", description: "New visitor count." },
      note: s("New note."),
    }),
    write: true,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const cls = attendanceClassFor(args, snap);
      const date = attendanceDateFrom(args);
      const kids = snap.children.filter((c) => c.classId === cls.id);

      const { record } = await call<{ record: AttendanceRecord | null }>(attendanceGET, rt.token, "GET", `/api/attendance?classId=${encodeURIComponent(cls.id)}&date=${date}`);
      if (!record) throw new ToolError(`No register has been saved for ${cls.name} on ${date} yet — use record_attendance first.`);

      const resolved = resolveChildNames(
        { present: strList(args, "present") ?? [], absent: strList(args, "absent") ?? [], excused: strList(args, "excused") ?? [] },
        kids,
        cls.name
      );
      const marks: Record<string, AttendanceStatus> = { ...record.marks };
      for (const id of resolved.present) marks[id] = "present";
      for (const id of resolved.absent) marks[id] = "absent";
      for (const id of resolved.excused) marks[id] = "excused";

      const changedKids = resolved.present.size + resolved.absent.size + resolved.excused.size;
      const visitors = typeof args.visitors === "number" ? Math.max(0, Math.floor(args.visitors)) : record.visitors;
      const note = typeof args.note === "string" ? args.note : record.note;
      if (changedKids === 0 && visitors === record.visitors && note === record.note) throw new ToolError("Nothing to change — name at least one child, or give a new visitor count or note.");

      await call(attendancePUT, rt.token, "PUT", "/api/attendance", { classId: cls.id, date, marks, visitors, note });
      const bits: string[] = [];
      if (resolved.present.size) bits.push(`${namesOf(kids, [...resolved.present]).join(", ")} → present`);
      if (resolved.absent.size) bits.push(`${namesOf(kids, [...resolved.absent]).join(", ")} → absent`);
      if (resolved.excused.size) bits.push(`${namesOf(kids, [...resolved.excused]).join(", ")} → excused`);
      if (visitors !== record.visitors) bits.push(`visitors → ${visitors}`);
      return { summary: `Updated attendance for ${cls.name} on ${date}${bits.length ? ` (${bits.join("; ")})` : ""}`, result: { ok: true } };
    },
  },
  {
    name: "get_attendance",
    description: "Read the saved attendance register for a class on a date: who was present, absent, excused, plus visitors.",
    parameters: schema({ class: s("Class name or id. Omit to use the user's own class."), date: s("YYYY-MM-DD. Omit for today.") }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const cls = attendanceClassFor(args, snap);
      const date = attendanceDateFrom(args);
      const kids = snap.children.filter((c) => c.classId === cls.id);
      const { record } = await call<{ record: AttendanceRecord | null }>(attendanceGET, rt.token, "GET", `/api/attendance?classId=${encodeURIComponent(cls.id)}&date=${date}`);
      if (!record) return { summary: `Read attendance for ${cls.name}`, result: { class: cls.name, date, recorded: false } };
      const ids = (status: AttendanceStatus) => Object.entries(record.marks).filter(([, m]) => m === status).map(([id]) => id);
      return {
        summary: `Read attendance for ${cls.name}`,
        result: {
          class: cls.name,
          date,
          recorded: true,
          present: namesOf(kids, ids("present")),
          absent: namesOf(kids, ids("absent")),
          excused: namesOf(kids, ids("excused")),
          visitors: record.visitors,
          note: record.note ?? null,
          savedBy: userName(snap, record.updatedBy ?? record.takenBy),
        },
      };
    },
  },
  {
    name: "get_child_attendance",
    description: "Read one child's attendance history: rate, counts of present/absent/excused, how many sessions in a row they have missed, and recent sessions.",
    parameters: schema({ child: s("Child's name or id.") }, ["child"]),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const child = pick(snap.children, needStr(args, "child"), (c) => c.name, "child");
      const { records } = await call<{ records: AttendanceRecord[] }>(attendanceGET, rt.token, "GET", `/api/attendance?childId=${encodeURIComponent(child.id)}&weeks=52`);
      const s = summarizeChild(records, child.id);
      return {
        summary: `Read ${child.name}'s attendance`,
        result: {
          child: child.name,
          sessionsRecorded: s.total,
          ratePercent: s.rate,
          present: s.present,
          absent: s.absent,
          excused: s.excused,
          missedInARow: s.missedInARow,
          recent: s.sessions.slice(0, 8).map((x) => ({ date: x.date, status: x.status })),
        },
      };
    },
  },
  {
    name: "list_absentees",
    description:
      "Find children who have missed several sessions in a row (absent or excused) — for pastoral follow-up. Looks at the recent weeks of one class, or of all classes for administrators.",
    parameters: schema({
      class: s("Class name or id. Omit for the user's own class (administrators without a class get every class)."),
      minInARow: { type: "number", description: "Minimum consecutive sessions missed (default 2)." },
      weeks: { type: "number", description: "How many recent weeks to look at (default 12, max 52)." },
    }),
    write: false,
    async run(args, rt) {
      const snap = await rt.snapshot();
      const minInARow = typeof args.minInARow === "number" ? Math.max(1, Math.floor(args.minInARow)) : 2;
      const weeks = typeof args.weeks === "number" ? Math.min(52, Math.max(1, Math.floor(args.weeks))) : 12;
      const today = todayIso();
      const from = addDays(today, -7 * weeks);

      let classes: SchoolClass[];
      if (str(args, "class")) classes = [pick(snap.classes, str(args, "class")!, (c) => c.name, "class")];
      else if (snap.currentUser.classId && snap.classes.some((c) => c.id === snap.currentUser.classId)) classes = snap.classes.filter((c) => c.id === snap.currentUser.classId);
      else classes = snap.classes;

      const found: { child: string; class: string; missedInARow: number; ratePercent: number | null; lastPresent: string | null }[] = [];
      for (const cls of classes) {
        const { records } = await call<{ records: AttendanceRecord[] }>(
          attendanceGET,
          rt.token,
          "GET",
          `/api/attendance?classId=${encodeURIComponent(cls.id)}&from=${from}&to=${today}`
        );
        for (const kid of snap.children.filter((c) => c.classId === cls.id)) {
          const s = summarizeChild(records, kid.id);
          if (s.missedInARow >= minInARow) {
            found.push({ child: kid.name, class: cls.name, missedInARow: s.missedInARow, ratePercent: s.rate, lastPresent: s.sessions.find((x) => x.status === "present")?.date ?? null });
          }
        }
      }
      found.sort((a, b) => b.missedInARow - a.missedInARow);
      return { summary: "Listed children with repeated absences", result: { lookedBackWeeks: weeks, minInARow, children: found } };
    },
  },

  // ------------------------------------------------------------ notifications & profile
  {
    name: "mark_notifications_read",
    description: "Mark all of the user's notifications as read.",
    parameters: schema({}),
    write: true,
    async run(_args, rt) {
      await call(notificationsPATCH, rt.token, "PATCH", "/api/notifications");
      return { summary: "Marked all notifications as read", result: { ok: true } };
    },
  },
  {
    name: "clear_notifications",
    description: "Clear (hide) all of the user's notifications.",
    parameters: schema({}),
    write: true,
    async run(_args, rt) {
      await call(notificationsDELETE, rt.token, "DELETE", "/api/notifications");
      return { summary: "Cleared all notifications", result: { ok: true } };
    },
  },
  {
    name: "update_my_profile",
    description: "Update the signed-in user's own profile: display name, bio, username, or accent color (hex like #3a7d5c).",
    parameters: schema({ name: s("New display name."), bio: s("New bio."), username: s("New username (3-24 letters, numbers, . _ -)."), accentColor: s("Accent color as hex, e.g. #3a7d5c.") }),
    write: true,
    async run(args, rt) {
      const body: Record<string, unknown> = { action: "update-profile" };
      for (const k of ["name", "bio", "username", "accentColor"] as const) if (typeof args[k] === "string") body[k] = args[k];
      await call(profilePATCH, rt.token, "PATCH", "/api/users/me", body);
      return { summary: "Updated your profile", result: { ok: true } };
    },
  },
];

const toolsByName = new Map(tools.map((t) => [t.name, t]));

export function getToolDeclarations() {
  return tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters }));
}

export function getTool(name: string): ToolDef | undefined {
  return toolsByName.get(name);
}

/** Result sizes are capped so one large list can't blow up the model's context. */
export function serializeResult(result: unknown): unknown {
  const text = JSON.stringify(result);
  if (text.length <= 12000) return result;
  return { truncated: true, note: "Result was too large; narrow the request with a filter.", preview: text.slice(0, 12000) };
}
