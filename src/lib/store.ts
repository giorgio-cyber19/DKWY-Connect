import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "./api-client";
import { pickColor } from "./colors";
import type {
  User,
  AgeGroup,
  SchoolClass,
  Child,
  Guardian,
  ArtworkItem,
  PhotoAlbum,
  VideoItem,
  ChildDocument,
  SpiritualMilestone,
  LessonPlan,
  Post,
  MediaItem,
  DocumentItem,
  CalendarEvent,
  PrayerEntry,
  Notification,
  AuditLogEntry,
} from "./types";

export { pickColor };

interface BootstrapResponse {
  currentUser: User;
  users: User[];
  ageGroups: AgeGroup[];
  classes: SchoolClass[];
  children: Child[];
  lessonPlans: LessonPlan[];
  posts: Post[];
  mediaItems: MediaItem[];
  documentItems: DocumentItem[];
  calendarEvents: CalendarEvent[];
  prayerEntries: PrayerEntry[];
  notifications: Notification[];
  auditLog: AuditLogEntry[];
}

interface AppState {
  users: User[];
  ageGroups: AgeGroup[];
  classes: SchoolClass[];
  children: Child[];
  lessonPlans: LessonPlan[];
  posts: Post[];
  mediaItems: MediaItem[];
  documentItems: DocumentItem[];
  calendarEvents: CalendarEvent[];
  prayerEntries: PrayerEntry[];
  notifications: Notification[];
  auditLog: AuditLogEntry[];
  currentUserId: string | null;
  hydrated: boolean;
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;

  // server sync
  bootstrap: () => Promise<void>;

  // auth
  createFirstAdmin: (input: { name: string; email: string; password: string }) => Promise<User>;
  login: (identifier: string, password: string) => Promise<User | null>;
  logout: () => void;

  // self-service account
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (input: { name?: string; bio?: string; username?: string | null }) => Promise<User>;

  // notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // teachers / users
  createTeacher: (input: { name: string; email: string; classId: string | null; title: string; username?: string }) => Promise<{ user: User; tempPassword: string }>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetUserPassword: (id: string) => Promise<string>;
  setUsername: (id: string, username: string | null) => Promise<void>;

  // classes / age groups
  createAgeGroup: (input: { name: string; range: string }) => Promise<AgeGroup>;
  createClass: (input: { name: string; ageGroupId: string; room: string }) => Promise<SchoolClass>;

  // children
  createChild: (input: {
    name: string;
    age: number;
    birthday: string;
    classId: string;
    teacherId: string;
    guardians: Guardian[];
    address?: string;
    allergies?: string;
  }) => Promise<Child>;
  addArtwork: (childId: string, item: Omit<ArtworkItem, "id">) => Promise<void>;
  addAlbum: (childId: string, item: Omit<PhotoAlbum, "id">) => Promise<void>;
  addVideo: (childId: string, item: Omit<VideoItem, "id">) => Promise<void>;
  addChildDocument: (childId: string, item: Omit<ChildDocument, "id">) => Promise<void>;
  addMilestone: (childId: string, item: Omit<SpiritualMilestone, "id">) => Promise<void>;
  addObservation: (childId: string, authorId: string, note: string, tag?: string) => Promise<void>;

  // lessons
  createLesson: (data: Omit<LessonPlan, "id" | "updatedAt" | "versions">) => Promise<LessonPlan>;
  updateLesson: (id: string, data: Partial<LessonPlan>) => Promise<void>;

  // posts
  createPost: (post: Omit<Post, "id" | "date" | "reactions" | "comments" | "pinned">) => Promise<Post>;
  toggleReaction: (postId: string, emoji: string, userId: string) => Promise<void>;
  addComment: (postId: string, authorId: string, text: string) => Promise<void>;
  votePoll: (postId: string, userId: string, optionIndex: number) => Promise<void>;
  togglePinPost: (postId: string) => Promise<void>;
  removePost: (postId: string) => Promise<void>;

  // media / documents
  createMediaItem: (item: Omit<MediaItem, "id" | "uploadedAt">) => Promise<MediaItem>;
  createDocumentItem: (item: Omit<DocumentItem, "id" | "uploadedAt">) => Promise<DocumentItem>;

  // calendar
  createEvent: (item: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;

  // prayer
  createPrayerEntry: (item: Omit<PrayerEntry, "id" | "date" | "prayedByUserIds">) => Promise<PrayerEntry>;
  togglePrayedFor: (id: string, userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [],
      ageGroups: [],
      classes: [],
      children: [],
      lessonPlans: [],
      posts: [],
      mediaItems: [],
      documentItems: [],
      calendarEvents: [],
      prayerEntries: [],
      notifications: [],
      auditLog: [],
      currentUserId: null,
      hydrated: false,
      sessionToken: null,
      setSessionToken: (token) => set({ sessionToken: token }),

      bootstrap: async () => {
        try {
          const data = await apiGet<BootstrapResponse>("/api/data/bootstrap");
          set({
            currentUserId: data.currentUser.id,
            users: data.users,
            ageGroups: data.ageGroups,
            classes: data.classes,
            children: data.children,
            lessonPlans: data.lessonPlans,
            posts: data.posts,
            mediaItems: data.mediaItems,
            documentItems: data.documentItems,
            calendarEvents: data.calendarEvents,
            prayerEntries: data.prayerEntries,
            notifications: data.notifications,
            auditLog: data.auditLog,
          });
        } catch (err) {
          // 401s are already handled globally by api-client (redirects to /login).
          // Anything else (network blip) is left for the next poll to retry.
          if (!(err instanceof ApiError) || err.status !== 401) console.error("bootstrap failed:", err);
        }
      },

      createFirstAdmin: async ({ name, email, password }) => {
        const { token, user } = await apiPost<{ token: string; user: User }>("/api/auth/setup", { name, email, password });
        set({ sessionToken: token, currentUserId: user.id, users: [user] });
        await get().bootstrap();
        return user;
      },

      login: async (identifier, password) => {
        try {
          const { token, user } = await apiPost<{ token: string; user: User }>("/api/auth/login", { identifier, password });
          set({ sessionToken: token, currentUserId: user.id });
          await get().bootstrap();
          return user;
        } catch {
          return null;
        }
      },

      logout: () =>
        set({
          currentUserId: null,
          sessionToken: null,
          users: [],
          ageGroups: [],
          classes: [],
          children: [],
          lessonPlans: [],
          posts: [],
          mediaItems: [],
          documentItems: [],
          calendarEvents: [],
          prayerEntries: [],
          notifications: [],
          auditLog: [],
        }),

      changeOwnPassword: async (currentPassword, newPassword) => {
        const { user } = await apiPatch<{ user: User }>("/api/users/me", { action: "change-password", currentPassword, newPassword });
        set((s) => ({ users: s.users.map((u) => (u.id === user.id ? user : u)) }));
      },

      updateProfile: async (input) => {
        const { user } = await apiPatch<{ user: User }>("/api/users/me", { action: "update-profile", ...input });
        set((s) => ({ users: s.users.map((u) => (u.id === user.id ? user : u)) }));
        return user;
      },

      markNotificationRead: async (id) => {
        await apiPatch(`/api/notifications/${id}`);
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      },

      markAllNotificationsRead: async () => {
        await apiPatch("/api/notifications");
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
      },

      createTeacher: async (input) => {
        const { user, tempPassword } = await apiPost<{ user: User; tempPassword: string }>("/api/teachers", input);
        set((s) => ({
          users: [...s.users, user],
          classes: input.classId
            ? s.classes.map((c) => (c.id === input.classId ? { ...c, teacherIds: Array.from(new Set([...c.teacherIds, user.id])) } : c))
            : s.classes,
        }));
        return { user, tempPassword };
      },

      toggleUserStatus: async (id) => {
        const { user } = await apiPatch<{ user: User }>(`/api/users/${id}`, { action: "toggle-status" });
        set((s) => ({ users: s.users.map((u) => (u.id === id ? user : u)) }));
      },

      resetUserPassword: async (id) => {
        const { user, tempPassword } = await apiPatch<{ user: User; tempPassword: string }>(`/api/users/${id}`, { action: "reset-password" });
        set((s) => ({ users: s.users.map((u) => (u.id === id ? user : u)) }));
        return tempPassword;
      },

      setUsername: async (id, username) => {
        const { user } = await apiPatch<{ user: User }>(`/api/users/${id}`, { action: "set-username", username });
        set((s) => ({ users: s.users.map((u) => (u.id === id ? user : u)) }));
      },

      createAgeGroup: async (input) => {
        const ageGroup = await apiPost<AgeGroup>("/api/age-groups", input);
        set((s) => ({ ageGroups: [...s.ageGroups, ageGroup] }));
        return ageGroup;
      },

      createClass: async (input) => {
        const schoolClass = await apiPost<SchoolClass>("/api/classes", input);
        set((s) => ({ classes: [...s.classes, schoolClass] }));
        return schoolClass;
      },

      createChild: async (input) => {
        const child = await apiPost<Child>("/api/children", input);
        set((s) => ({
          children: [...s.children, child],
          classes: s.classes.map((c) => (c.id === child.classId ? { ...c, childCount: c.childCount + 1 } : c)),
        }));
        return child;
      },

      addArtwork: async (childId, item) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "artwork", item });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },
      addAlbum: async (childId, item) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "album", item });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },
      addVideo: async (childId, item) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "video", item });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },
      addChildDocument: async (childId, item) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "document", item });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },
      addMilestone: async (childId, item) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "milestone", item });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },
      addObservation: async (childId, authorId, note, tag) => {
        const child = await apiPost<Child>(`/api/children/${childId}/records`, { kind: "observation", authorId, note, tag });
        set((s) => ({ children: s.children.map((c) => (c.id === childId ? child : c)) }));
      },

      createLesson: async (data) => {
        const lesson = await apiPost<LessonPlan>("/api/lessons", data);
        set((s) => ({ lessonPlans: [lesson, ...s.lessonPlans] }));
        return lesson;
      },

      updateLesson: async (id, data) => {
        const lesson = await apiPatch<LessonPlan>(`/api/lessons/${id}`, data);
        set((s) => ({ lessonPlans: s.lessonPlans.map((l) => (l.id === id ? lesson : l)) }));
      },

      createPost: async (post) => {
        const newPost = await apiPost<Post>("/api/posts", post);
        set((s) => ({ posts: [newPost, ...s.posts] }));
        return newPost;
      },

      toggleReaction: async (postId, emoji, userId) => {
        const post = await apiPatch<Post>(`/api/posts/${postId}`, { action: "react", emoji, userId });
        set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? post : p)) }));
      },

      addComment: async (postId, authorId, text) => {
        const post = await apiPatch<Post>(`/api/posts/${postId}`, { action: "comment", authorId, text });
        set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? post : p)) }));
      },

      votePoll: async (postId, userId, optionIndex) => {
        const post = await apiPatch<Post>(`/api/posts/${postId}`, { action: "vote", userId, optionIndex });
        set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? post : p)) }));
      },

      togglePinPost: async (postId) => {
        const post = await apiPatch<Post>(`/api/posts/${postId}`, { action: "pin" });
        set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? post : p)) }));
      },

      removePost: async (postId) => {
        await apiDelete(`/api/posts?id=${postId}`);
        set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
      },

      createMediaItem: async (item) => {
        const media = await apiPost<MediaItem>("/api/media", item);
        set((s) => ({ mediaItems: [media, ...s.mediaItems] }));
        return media;
      },

      createDocumentItem: async (item) => {
        const doc = await apiPost<DocumentItem>("/api/documents", item);
        set((s) => ({ documentItems: [doc, ...s.documentItems] }));
        return doc;
      },

      createEvent: async (item) => {
        const event = await apiPost<CalendarEvent>("/api/events", item);
        set((s) => ({ calendarEvents: [...s.calendarEvents, event] }));
        return event;
      },

      createPrayerEntry: async (item) => {
        const entry = await apiPost<PrayerEntry>("/api/prayer", item);
        set((s) => ({ prayerEntries: [entry, ...s.prayerEntries] }));
        return entry;
      },

      togglePrayedFor: async (id, userId) => {
        const entry = await apiPatch<PrayerEntry>(`/api/prayer/${id}`, { userId });
        set((s) => ({ prayerEntries: s.prayerEntries.map((p) => (p.id === id ? entry : p)) }));
      },
    }),
    {
      name: "dwky-connect-data",
      // Next.js executes "use client" components on the server for the initial
      // render, where `localStorage` doesn't exist — guard every call and skip
      // automatic hydration so the server and first client render both start
      // from the same empty state; app-shell.tsx triggers hydration manually.
      storage: createJSONStorage(() => ({
        getItem: (name) => (typeof window === "undefined" ? null : window.localStorage.getItem(name)),
        setItem: (name, value) => {
          if (typeof window !== "undefined") window.localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          if (typeof window !== "undefined") window.localStorage.removeItem(name);
        },
      })),
      skipHydration: true,
      // Only the session survives a refresh — everything else is server data,
      // repopulated by bootstrap() once hydration completes.
      partialize: (s) => ({ sessionToken: s.sessionToken, currentUserId: s.currentUserId }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    }
  )
);

// Non-reactive lookups — mirror the old mock-data.ts helper API so most call
// sites didn't need to change, just the import source. Staleness is bounded
// by the last bootstrap()/poll cycle (see use-live-sync.ts), not instant.
export const getUser = (id?: string) => (id ? useAppStore.getState().users.find((u) => u.id === id) : undefined);
export const getClass = (id?: string) => (id ? useAppStore.getState().classes.find((c) => c.id === id) : undefined);
export const getAgeGroup = (id?: string) => (id ? useAppStore.getState().ageGroups.find((a) => a.id === id) : undefined);
export const getChild = (id: string) => useAppStore.getState().children.find((c) => c.id === id);
export const getLesson = (id: string) => useAppStore.getState().lessonPlans.find((l) => l.id === id);
