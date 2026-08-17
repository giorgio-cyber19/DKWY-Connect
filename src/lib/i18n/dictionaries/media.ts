import { mediaFolders } from "@/lib/constants";

const en = {
  eyebrow: "Resources",
  title: "Media Library",
  description: "A centralized home for lesson illustrations, worship songs, craft templates, photos, and curriculum resources.",
  allFiles: "All Files",
  searchPlaceholder: "Search by name or tag…",
  selected: "selected",
  bulkDownload: "Bulk Download",
  notAvailableTestEnv: "Not available in this test environment",
  noFilesYetTitle: "No files yet",
  noFilesFoundTitle: "No files found",
  noFilesYetDescription: "Upload the first file to this library.",
  noFilesFoundDescription: "Try a different search term, or upload new files to this folder.",
  uploadedLabel: "Uploaded",
  byLabel: "by",
  addedBeforeDrive: "This file was added before Google Drive was connected",
  uploadModalTitle: "Upload to Media Library",
  folderLabel: "Folder",
  tagsLabel: "Tags (comma separated, optional)",
  tagsPlaceholder: "e.g. worship, kids",
  uploadingToDrive: "Uploading to Google Drive…",
  clickToChooseFiles: "Click to choose files",
  fileTypeHint: "Images, video, audio, PDF, Word, PowerPoint · up to 4MB",
  driveNote: "Files are uploaded to your church's connected Google Drive.",
};

const nl: typeof en = {
  eyebrow: "Bronnen",
  title: "Mediabibliotheek",
  description: "Een centrale plek voor lesillustraties, aanbiddingsliederen, knutselsjablonen, foto's en lesmateriaal.",
  allFiles: "Alle Bestanden",
  searchPlaceholder: "Zoek op naam of label…",
  selected: "geselecteerd",
  bulkDownload: "Meerdere Downloaden",
  notAvailableTestEnv: "Niet beschikbaar in deze testomgeving",
  noFilesYetTitle: "Nog geen bestanden",
  noFilesFoundTitle: "Geen bestanden gevonden",
  noFilesYetDescription: "Upload het eerste bestand naar deze bibliotheek.",
  noFilesFoundDescription: "Probeer een andere zoekterm, of upload nieuwe bestanden naar deze map.",
  uploadedLabel: "Geüpload op",
  byLabel: "door",
  addedBeforeDrive: "Dit bestand is toegevoegd voordat Google Drive verbonden was",
  uploadModalTitle: "Uploaden naar Mediabibliotheek",
  folderLabel: "Map",
  tagsLabel: "Labels (gescheiden door komma's, optioneel)",
  tagsPlaceholder: "bijv. aanbidding, kinderen",
  uploadingToDrive: "Uploaden naar Google Drive…",
  clickToChooseFiles: "Klik om bestanden te kiezen",
  fileTypeHint: "Afbeeldingen, video, audio, PDF, Word, PowerPoint · tot 4MB",
  driveNote: "Bestanden worden geüpload naar de Google Drive van je kerk.",
};

export const media = { en, nl };

// Display labels for the folder taxonomy in src/lib/constants.ts. The
// mediaFolders array itself must stay untranslated (it's the persisted
// MediaItem.folder value) — this map is for on-screen labels only.
export const mediaFolderLabels: { en: Record<string, string>; nl: Record<string, string> } = {
  en: Object.fromEntries(mediaFolders.map((f) => [f, f])),
  nl: {
    "Lesson Illustrations": "Lesillustraties",
    "Worship Songs": "Aanbiddingsliederen",
    "Craft Templates": "Knutselsjablonen",
    "Event Photos": "Evenementfoto's",
    Videos: "Video's",
    "Curriculum Resources": "Lesmateriaal",
    "Printable Materials": "Afdrukbaar Materiaal",
  },
};
