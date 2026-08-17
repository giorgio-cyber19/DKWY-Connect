// Fixed category structure for the Media Library — not user data, just the
// folder taxonomy the app organizes uploads into.
// NOTE: these are persisted values (stored on MediaItem.folder and sent to the
// API on upload) as well as the untranslated `value`s behind the folder
// filter UI — do not translate them here. Display labels live in
// src/lib/i18n/dictionaries/media.ts (mediaFolderLabels).
export const mediaFolders = [
  "Lesson Illustrations",
  "Worship Songs",
  "Craft Templates",
  "Event Photos",
  "Videos",
  "Curriculum Resources",
  "Printable Materials",
];
