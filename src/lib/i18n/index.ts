import { common } from "./dictionaries/common";
import { dashboard } from "./dictionaries/dashboard";
import { lessons } from "./dictionaries/lessons";
import { updates } from "./dictionaries/updates";
import { children } from "./dictionaries/children";
import { media } from "./dictionaries/media";
import { documents } from "./dictionaries/documents";
import { calendar } from "./dictionaries/calendar";
import { roster } from "./dictionaries/roster";
import { bible } from "./dictionaries/bible";
import { myClass } from "./dictionaries/myClass";
import { settings } from "./dictionaries/settings";
import { admin } from "./dictionaries/admin";
import { auth } from "./dictionaries/auth";
import { layout } from "./dictionaries/layout";
import { aiChat } from "./dictionaries/aiChat";

export type Language = "en" | "nl";

const dictionaries = {
  en: {
    common: common.en,
    dashboard: dashboard.en,
    lessons: lessons.en,
    updates: updates.en,
    children: children.en,
    media: media.en,
    documents: documents.en,
    calendar: calendar.en,
    roster: roster.en,
    bible: bible.en,
    myClass: myClass.en,
    settings: settings.en,
    admin: admin.en,
    auth: auth.en,
    layout: layout.en,
    aiChat: aiChat.en,
  },
  nl: {
    common: common.nl,
    dashboard: dashboard.nl,
    lessons: lessons.nl,
    updates: updates.nl,
    children: children.nl,
    media: media.nl,
    documents: documents.nl,
    calendar: calendar.nl,
    roster: roster.nl,
    bible: bible.nl,
    myClass: myClass.nl,
    settings: settings.nl,
    admin: admin.nl,
    auth: auth.nl,
    layout: layout.nl,
    aiChat: aiChat.nl,
  },
} as const;

type Dict = typeof dictionaries.en;

/** Dotted "namespace.key" paths, e.g. "common.save" | "dashboard.greeting" | ... — every dictionary is exactly one level deep. */
export type TranslationKey = { [K in keyof Dict & string]: `${K}.${keyof Dict[K] & string}` }[keyof Dict & string];

export function translate(language: Language, key: TranslationKey): string {
  const [ns, leaf] = key.split(".") as [keyof Dict, string];
  const nsObj = dictionaries[language][ns] as unknown as Record<string, string>;
  return nsObj?.[leaf] ?? key;
}
