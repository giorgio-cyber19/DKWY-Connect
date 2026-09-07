import { ApiError } from "@/lib/api-client";
import { DriveNotConfiguredError, NotSignedInError } from "@/lib/upload";
import type { Language } from "./index";

const errorMessages: Record<string, Record<Language, string>> = {
  bad_request: { en: "Please check the form and try again.", nl: "Controleer het formulier en probeer het opnieuw." },
  unauthorized: { en: "Sign in to DWKY Connect first.", nl: "Log eerst in bij DWKY Connect." },
  forbidden: { en: "You don't have permission to do that.", nl: "Je hebt hier geen toestemming voor." },
  not_found: { en: "That item no longer exists.", nl: "Dit item bestaat niet meer." },
  invalid_credentials: { en: "That email/username and password don't match an account.", nl: "Dit e-mailadres/gebruikersnaam en wachtwoord komen niet overeen met een account." },
  already_set_up: { en: "This workspace already has an administrator.", nl: "Deze werkruimte heeft al een beheerder." },
  username_taken: { en: "That username is already in use.", nl: "Deze gebruikersnaam is al in gebruik." },
  email_taken: { en: "That email is already in use by another account.", nl: "Dit e-mailadres is al in gebruik bij een ander account." },
  not_configured: { en: "Google Drive isn't connected yet. An administrator needs to connect it from Settings.", nl: "Google Drive is nog niet verbonden. Een beheerder moet dit instellen via Instellingen." },
  upload_failed: { en: "Upload to Google Drive failed. Check server logs.", nl: "Uploaden naar Google Drive is mislukt. Controleer de serverlogs." },
  delete_failed: { en: "Delete failed.", nl: "Verwijderen is mislukt." },
  rename_failed: { en: "Rename failed.", nl: "Hernoemen is mislukt." },
  list_failed: { en: "Couldn't load files from Google Drive.", nl: "Kon bestanden niet laden vanuit Google Drive." },
  storage_unavailable: { en: "Couldn't retrieve storage details from Google Drive.", nl: "Kon opslaggegevens niet ophalen van Google Drive." },
  invalid_reset_token: { en: "This reset link is invalid or has expired. Request a new one.", nl: "Deze resetlink is ongeldig of verlopen. Vraag een nieuwe aan." },
  in_use: {
    en: "This is still being used elsewhere. Reassign or remove those items first.",
    nl: "Dit wordt nog ergens anders gebruikt. Wijs eerst iets anders toe of verwijder die items.",
  },
  ai_not_configured: {
    en: "DWKY AI isn't set up yet. An administrator needs to add an API key.",
    nl: "DWKY AI is nog niet ingesteld. Een beheerder moet een API-sleutel toevoegen.",
  },
  rate_limited: {
    en: "You've reached the current AI usage limit. Please try again later.",
    nl: "Je hebt de huidige AI-gebruikslimiet bereikt. Probeer het later opnieuw.",
  },
  auth_rate_limited: {
    en: "Too many attempts. Please wait a few minutes and try again.",
    nl: "Te veel pogingen. Wacht een paar minuten en probeer het opnieuw.",
  },
  ai_busy: {
    en: "DWKY AI is temporarily unavailable. Please try again in a moment.",
    nl: "DWKY AI is tijdelijk niet beschikbaar. Probeer het over een moment opnieuw.",
  },
  ai_error: {
    en: "DWKY AI is temporarily unavailable. Please try again in a moment.",
    nl: "DWKY AI is tijdelijk niet beschikbaar. Probeer het over een moment opnieuw.",
  },
};

const generic: Record<Language, string> = {
  en: "Something went wrong. Please try again.",
  nl: "Er is iets misgegaan. Probeer het opnieuw.",
};

const notSignedIn: Record<Language, string> = {
  en: "You need to be signed in to do that.",
  nl: "Je moet ingelogd zijn om dit te doen.",
};

const driveNotConfigured: Record<Language, string> = {
  en: "Google Drive isn't connected yet. An administrator needs to connect it from Settings.",
  nl: "Google Drive is nog niet verbonden. Een beheerder moet dit instellen via Instellingen.",
};

/** Translates a caught error into user-facing copy, preferring a known error code over the server's raw (English) message. */
export function translateApiError(err: unknown, language: Language): string {
  if (err instanceof ApiError) {
    return errorMessages[err.code]?.[language] ?? generic[language];
  }
  if (err instanceof DriveNotConfiguredError) return driveNotConfigured[language];
  if (err instanceof NotSignedInError) return notSignedIn[language];
  return generic[language];
}
