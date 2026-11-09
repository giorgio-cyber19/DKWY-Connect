import type { Language } from "./i18n";

/** The in-app user guide (page /help). Plain data so both languages can be kept side by side. */

export type HelpIconId =
  | "rocket"
  | "wrench"
  | "home"
  | "class"
  | "children"
  | "lessons"
  | "bible"
  | "ai"
  | "updates"
  | "files"
  | "calendar"
  | "roster"
  | "settings"
  | "admin"
  | "faq";

export type HelpBlock =
  | { kind: "steps"; title?: string; items: string[] }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "tip"; text: string }
  | { kind: "note"; text: string };

export interface HelpSection {
  id: string;
  icon: HelpIconId;
  title: string;
  /** Only administrators can do what this section describes. */
  adminOnly?: boolean;
  lead: string;
  blocks: HelpBlock[];
}

export interface HelpContent {
  ui: {
    eyebrow: string;
    title: string;
    description: string;
    print: string;
    searchPlaceholder: string;
    contents: string;
    adminBadge: string;
    noResultsTitle: string;
    noResultsDescription: string;
    tipLabel: string;
    noteLabel: string;
    printFooter: string;
  };
  sections: HelpSection[];
}

const nl: HelpContent = {
  ui: {
    eyebrow: "Hulp",
    title: "Handleiding",
    description: "Alles wat je moet weten om DWKY Connect te gebruiken — stap voor stap, van inloggen tot het maken van een presentie-PDF.",
    print: "Afdrukken / opslaan als PDF",
    searchPlaceholder: "Zoek in de handleiding…",
    contents: "Inhoud",
    adminBadge: "Alleen beheerders",
    noResultsTitle: "Niets gevonden",
    noResultsDescription: "Probeer een ander woord, bijvoorbeeld “wachtwoord”, “presentie” of “map”.",
    tipLabel: "Tip",
    noteLabel: "Let op",
    printFooter: "DWKY Connect — Handleiding",
  },
  sections: [
    {
      id: "aan-de-slag",
      icon: "rocket",
      title: "Aan de slag",
      lead: "DWKY Connect is de besloten werkplek van de Zondagsschool en Jeugd van Duta Watjana Kids & Youth Committee. Iedereen krijgt een eigen account van een beheerder; je kunt je niet zelf registreren.",
      blocks: [
        {
          kind: "steps",
          title: "Inloggen",
          items: [
            "Ga naar dwky-connect.org.",
            "Vul je e-mailadres of gebruikersnaam in, en je wachtwoord.",
            "Zet **Ingelogd blijven** aan als je op je eigen telefoon of computer werkt.",
            "Klik op **Inloggen**.",
          ],
        },
        {
          kind: "steps",
          title: "Wachtwoord vergeten?",
          items: [
            "Klik op de inlogpagina op **Wachtwoord vergeten?**.",
            "Vul je e-mailadres of gebruikersnaam in en klik op **Resetlink versturen**.",
            "Open de e-mail en klik op de link. De link werkt 1 uur.",
            "Kies een nieuw wachtwoord (minimaal 8 tekens).",
          ],
        },
        {
          kind: "list",
          title: "Goed om te weten",
          items: [
            "Kreeg je van de beheerder een eenmalig wachtwoord? Dan vraagt de app bij je eerste keer inloggen om een eigen wachtwoord te kiezen.",
            "Na **30 minuten** zonder activiteit word je automatisch uitgelogd. Log gewoon opnieuw in; wat je had opgeslagen blijft bewaard.",
            "De app werkt op computer, tablet en telefoon. Op een telefoon open je het menu met de knop ☰ linksboven.",
            "Je kunt de app op je telefoon of computer installeren, zodat hij als een gewone app opent: kies in je browser “Installeren” of “Toevoegen aan beginscherm”.",
          ],
        },
        {
          kind: "list",
          title: "Wie mag wat?",
          items: [
            "**Leraar:** kijkt en werkt mee — eigen klas en presentie, kinderportfolio's, lesplannen, updates, documenten en media, kalender, en het rooster bijwerken.",
            "**Beheerder:** kan daarnaast klassen en leraren beheren, zondagen aan het rooster toevoegen of verwijderen, alle klassen bekijken, en gebruikt het Beheerpaneel (inclusief back-ups).",
          ],
        },
      ],
    },
    {
      id: "basis",
      icon: "wrench",
      title: "De basis: taal, donkere stand, zoeken en meldingen",
      lead: "Bovenin elk scherm staat een balk met knoppen die je overal gebruikt.",
      blocks: [
        {
          kind: "steps",
          title: "De taal veranderen (Nederlands ↔ Engels)",
          items: [
            "Kijk rechtsboven in de balk naar de knop met de landcode (**US** of **NL**).",
            "Klik erop: de hele app wisselt meteen van taal.",
            "Je keuze wordt onthouden op dit apparaat.",
          ],
        },
        {
          kind: "steps",
          title: "Donkere stand aan- of uitzetten",
          items: [
            "Klik rechtsboven op het **maan-** of **zonnetje-icoon**. Een maan betekent: klik om donker te worden; een zon: klik om weer licht te worden.",
            "Of ga naar **Instellingen → Weergave** en kies **Licht** of **Donker**.",
            "Je keuze wordt onthouden op dit apparaat en geldt alleen voor jou; anderen merken er niets van.",
          ],
        },
        {
          kind: "steps",
          title: "Je eigen accentkleur kiezen",
          items: [
            "Ga naar **Instellingen → Accentkleur**.",
            "Kies een kleur op het kleurenwiel of typ een hexcode.",
            "Met **Terugzetten naar standaard** ga je terug naar de oorspronkelijke kleur.",
          ],
        },
        {
          kind: "steps",
          title: "Zoeken in alles",
          items: [
            "Klik op de zoekbalk bovenin, of druk op **Ctrl + K** (Mac: **⌘ + K**).",
            "Typ een naam of woord. Je ziet resultaten uit kinderen, lesplannen, updates, documenten, media en docenten.",
            "Klik op een resultaat om er direct naartoe te gaan. Met **Esc** sluit je het zoekscherm.",
          ],
        },
        {
          kind: "steps",
          title: "Meldingen (het belletje)",
          items: [
            "Het belletje toont nieuwe meldingen, zoals een gepubliceerd lesplan, een reactie of een gebedsverzoek.",
            "Klik op een melding om ernaartoe te gaan.",
            "Met **Alles als gelezen markeren** haal je de bolletjes weg; met **Alles wissen** maak je de lijst leeg.",
            "Welke meldingen je krijgt, stel je in bij **Instellingen → Meldingen**.",
          ],
        },
        {
          kind: "list",
          title: "Je profielmenu en de gele knop",
          items: [
            "Klik op je initialen rechtsboven voor je profielmenu: hier ga je naar **Instellingen** of log je uit.",
            "De gele knop **Nieuw** (op een telefoon: de ronde **+**-knop rechtsonder) is een snelkoppeling om een lesplan, update, evenement te maken of bestanden te uploaden.",
            "In het menu links staat bovenaan het logo met **DWKY Connect**. Klik erop om altijd terug te gaan naar het Dashboard.",
          ],
        },
      ],
    },
    {
      id: "dashboard",
      icon: "home",
      title: "Dashboard",
      lead: "Je startscherm: in één oogopslag wat er speelt.",
      blocks: [
        {
          kind: "list",
          items: [
            "Een welkomstbanner met het **Vers van de Dag**.",
            "**Aankomende agenda** en evenementen.",
            "**Recente updates van leraren**.",
            "**Recent bijgewerkte portfolio's** en een overzicht van de klassen.",
          ],
        },
        { kind: "tip", text: "Klik op een blok of kaartje om direct naar de bijbehorende pagina te gaan." },
      ],
    },
    {
      id: "klas-en-presentie",
      icon: "class",
      title: "Klas en Presentie",
      lead: "Hier zie je je klas en hou je bij wie er elke zondag was. Beheerders zien alle klassen.",
      blocks: [
        {
          kind: "list",
          title: "Wat zie je hier?",
          items: [
            "**Leraar:** je eigen klas met het aantal kinderen, lesplannen, het lokaal, de presentie, de klaslijst en je lesplannen.",
            "**Beheerder:** een overzicht van alle klassen. Klik op een klas om hem te openen.",
          ],
        },
        {
          kind: "steps",
          title: "De presentie van een zondag registreren",
          items: [
            "Open **Klas en Presentie**. De datum staat standaard op vandaag; kies een andere datum als je een eerdere zondag wilt invullen.",
            "Klik op **+ Aanwezigheid registreren**.",
            "Er opent een lijst van de klas. **Vink de kinderen aan die er waren.** Wie je niet aanvinkt, wordt automatisch afwezig.",
            "Veel kinderen? Typ een deel van een naam in het zoekveld. Met **Alles selecteren** en **Wissen** vink je in één keer iedereen aan of uit.",
            "Staat een kind er nog niet tussen? Klik op **Nieuw kind toevoegen** (zie hieronder).",
            "Vul eventueel het aantal **bezoekers** in (kinderen die niet op de klaslijst staan) en een **notitie**.",
            "Klik op **Aanwezigheid opslaan**.",
          ],
        },
        {
          kind: "steps",
          title: "Een nieuw kind toevoegen tijdens de presentie",
          items: [
            "Klik in de lijst op **Nieuw kind toevoegen**.",
            "Vul de **naam** in. Meer is niet verplicht; geboortedatum, voogd en allergieën kun je later aanvullen.",
            "Klik op **Kind Toevoegen**. Het kind staat meteen in de klas, is aangevinkt als aanwezig en staat ook bij **Kinderportfolio's**.",
          ],
        },
        {
          kind: "steps",
          title: "Een opgeslagen presentie bekijken of aanpassen",
          items: [
            "Kies de datum: je ziet wie er aanwezig was.",
            "Klik op **+ Aanwezigheid wijzigen** om iets te corrigeren (bijvoorbeeld “Hanna was er toch”).",
            "Of klik in het **Presentieoverzicht** (hieronder) op een datum: die zondag opent dan bovenin.",
          ],
        },
        {
          kind: "list",
          title: "Presentieoverzicht van alle zondagen",
          items: [
            "Onder de presentie staat een tabel met de kinderen onder elkaar en de zondagen naast elkaar. Een **vinkje** betekent aanwezig. Kinderen die er op geen enkele getoonde zondag waren, staan niet in de lijst.",
            "Rechts zie je hoe vaak elk kind er was (bijvoorbeeld 5/8) en het percentage. Onderaan staan het aantal aanwezigen en bezoekers per zondag.",
            "Standaard zie je de laatste 8 zondagen. Met het keuzemenu rechtsboven kies je de laatste 16 of alle zondagen.",
          ],
        },
        {
          kind: "steps",
          title: "Een PDF maken van de presentie",
          items: [
            "**Eén zondag:** klik in de tabel op het pdf-icoontje onder de datum.",
            "**Een selectie:** vink onder de datums de zondagen aan die je wilt en kies **PDF maken → Geselecteerde zondagen**.",
            "**Alles:** kies **PDF maken → Alle zondagen**.",
            "De PDF wordt gedownload. Bij één zondag staat er een lijst met namen van de aanwezigen; bij meer zondagen een tabel met vinkjes, in liggend formaat en over meerdere pagina's als het veel zondagen zijn.",
          ],
        },
        {
          kind: "note",
          text: "Leraren kunnen een presentielijst tot 30 dagen terug invullen of aanpassen. Voor oudere zondagen is een beheerder nodig.",
        },
        {
          kind: "steps",
          title: "Voor beheerders: klassen openen, bewerken en aanmaken",
          items: [
            "Klik op een klaskaart om de klas te openen. Met **← Terug naar alle klassen** ga je terug.",
            "Klik op **Klas bewerken** om de naam, leeftijdsgroep of het lokaal te wijzigen.",
            "Klik op **Nieuwe klas** om een klas aan te maken; de nieuwe klas opent daarna meteen. Hiervoor moet er eerst een leeftijdsgroep bestaan (zie Beheerpaneel).",
          ],
        },
        { kind: "tip", text: "Je kunt de presentie ook aan DWKY AI doorgeven, bijvoorbeeld: “Aanwezig vandaag: Anna, Ben en Chloë”. Zie het hoofdstuk DWKY AI." },
      ],
    },
    {
      id: "kinderportfolio",
      icon: "children",
      title: "Kinderportfolio's",
      lead: "Het dossier van elk kind: gegevens, werk, foto's, groei en aanwezigheid — op één plek.",
      blocks: [
        {
          kind: "steps",
          title: "Een kind vinden of toevoegen",
          items: [
            "Open **Kinderportfolio's**. Zoek op naam, of kies bovenaan een klas bij **Alle Klassen**.",
            "Klik op een kaartje om het portfolio van het kind te openen.",
            "Een nieuw kind maak je met **Kind Toevoegen**. Alleen de naam en de klas zijn verplicht; de geboortedatum mag je later invullen.",
          ],
        },
        {
          kind: "steps",
          title: "De gegevens van een kind wijzigen",
          items: [
            "Open het portfolio en klik op **Bewerken**.",
            "Pas de naam, geboortedatum, klas (alleen beheerders), voogd, adres of allergieën aan. De leeftijd wordt automatisch uitgerekend.",
            "Klik op **Wijzigingen Opslaan**.",
          ],
        },
        {
          kind: "list",
          title: "De tabbladen in een portfolio",
          items: [
            "**Overzicht:** recent werk, mijlpalen en contactgegevens van de voogd.",
            "**Tekeningen, Foto's, Video's, Documenten:** voeg werk toe met de knop rechtsboven in het tabblad. Bestanden gaan naar de Google Drive van de gemeente.",
            "**Geestelijke Groei:** mijlpalen zoals een uit het hoofd geleerd vers, gebed of vriendelijkheid.",
            "**Observaties:** korte notities van leraren over het kind.",
            "**Aanwezigheid:** hoe vaak het kind komt, de laatste zondagen, en een seintje als het kind al meerdere weken ontbreekt.",
          ],
        },
        {
          kind: "note",
          text: "Alleen een beheerder kan een portfolio verwijderen (knop **Portfolio Verwijderen**). Dit kan niet ongedaan worden gemaakt.",
        },
      ],
    },
    {
      id: "lesplannen",
      icon: "lessons",
      title: "Lesplannen",
      lead: "Maak, bewaar en publiceer lesplannen per leeftijdsgroep.",
      blocks: [
        {
          kind: "steps",
          title: "Een lesplan maken",
          items: [
            "Open **Lesplannen** en klik op **Nieuwe Les** (of kies eerst een **Sjabloon**: Bijbelverhaal, Memorievers, VBS/speciaal evenement of leeg).",
            "Vul de gegevens in: titel, Bijbelgedeelte, thema, leeftijdsgroep, memorievers, leerdoelen, openingsactiviteit, Bijbelverhaal, gespreksvragen, knutselwerk, liederen, slotgebed en huiswerk.",
            "Voeg eventueel bijlagen toe, zoals een pdf, Word-bestand, afbeelding of YouTube-link.",
            "Bewaar het als **concept** (alleen jij ziet het) of **publiceer** het (het hele team ziet het en krijgt een melding).",
          ],
        },
        {
          kind: "list",
          title: "Daarna",
          items: [
            "Filter bovenaan op **Alle**, **Gepubliceerd** of **Concepten**, en op leeftijdsgroep.",
            "Open een les om hem te lezen. Met **Les Bewerken** pas je hem aan, met **Naar Concept Verplaatsen** of **Nu Publiceren** wijzig je de status.",
            "Met **Versiegeschiedenis** zie je eerdere versies van de les.",
          ],
        },
        { kind: "tip", text: "Hulp nodig bij een idee? Vraag het aan DWKY AI: “Maak een les over vergeving voor kinderen van 8 tot 10 jaar.”" },
      ],
    },
    {
      id: "bijbel",
      icon: "bible",
      title: "Bijbel",
      lead: "Lees de Bijbel in de app, met het Vers van de Dag.",
      blocks: [
        {
          kind: "steps",
          title: "Lezen en verzen markeren",
          items: [
            "Open **Bijbel** en kies op het tabblad **Lezen** een boek, hoofdstuk en vertaling.",
            "Tik op een vers en kies een kleur om het te markeren.",
            "Al je gemarkeerde verzen staan onder **Opgeslagen Verzen**. Met **Openen in Lezer** spring je terug naar die plek.",
          ],
        },
        { kind: "note", text: "Markeringen zijn persoonlijk: alleen jij ziet ze. Staat er dat de Bijbellezer nog niet is gekoppeld, vraag dan een beheerder om dit te regelen." },
      ],
    },
    {
      id: "ai",
      icon: "ai",
      title: "DWKY AI",
      lead: "Een digitale assistent die helpt met lesvoorbereiding en dingen in de app voor je kan doen.",
      blocks: [
        {
          kind: "steps",
          title: "Een gesprek beginnen",
          items: [
            "Open **DWKY AI**. Lees bij de eerste keer de korte waarschuwing en klik op **Ik begrijp het & ga verder**.",
            "Typ je vraag onderin en verstuur. Je kunt ook een van de voorbeeldvragen aanklikken.",
            "Met **Nieuw Gesprek** begin je opnieuw. Oude gesprekken staan links; je kunt ze hernoemen of verwijderen.",
          ],
        },
        {
          kind: "list",
          title: "Wat kun je vragen?",
          items: [
            "**Lesvoorbereiding:** “Geef 5 activiteiten voor kinderen van 8–10 jaar”, “Leg Psalm 51:12 uit voor kinderen”.",
            "**Dingen laten doen:** “Zet een leraarsvergadering in de kalender op vrijdag om 19:30”, “Wat staat er deze maand in de kalender?”.",
            "**Presentie doorgeven:** “Aanwezig vandaag: Anna, Ben, Chloë” — iedereen die je niet noemt, wordt als afwezig geregistreerd. Corrigeren kan ook: “Hanna was toch aanwezig.”",
            "**Opzoeken:** “Wie was er vorige week niet?”, “Hoe vaak komt Ben?”.",
          ],
        },
        {
          kind: "note",
          text: "Bij het verwijderen van iets (een evenement, kind, document…) vraagt DWKY AI altijd eerst om jouw bevestiging: klik op **Bevestigen** of **Annuleren**. De AI kan fouten maken: controleer lesmateriaal en Bijbelteksten altijd zelf.",
        },
      ],
    },
    {
      id: "updates",
      icon: "updates",
      title: "Updates & Bemoediging",
      lead: "Het prikbord van het team: mededelingen, overdenkingen, gebedsverzoeken en foto's.",
      blocks: [
        {
          kind: "steps",
          title: "Iets delen",
          items: [
            "Open **Updates & Bemoediging** en typ je bericht in het vak bovenaan.",
            "Wil je een foto meesturen? Klik op **Foto bijvoegen**. Wil je het team iets vragen? Klik op **Poll toevoegen** en vul de vraag en opties in.",
            "Klik op **Plaatsen**.",
          ],
        },
        {
          kind: "list",
          title: "Reageren",
          items: [
            "Reageer met een emoji, of schrijf een reactie.",
            "Bij een gebedsverzoek klik je op **Ik bid hiervoor**, zodat de ander weet dat er voor hem of haar gebeden is.",
            "Stem op een poll door een optie aan te klikken.",
            "Beheerders kunnen berichten **vastzetten** (ze staan dan bovenaan, onder “Vastgezet”) of verwijderen.",
          ],
        },
      ],
    },
    {
      id: "bestanden",
      icon: "files",
      title: "Documenten en Mediabibliotheek",
      lead: "Gedeelde bestanden van het team, opgeslagen in de Google Drive van de gemeente en overzichtelijk in mappen. Documenten is voor pdf-, Word- en Excel-bestanden; Mediabibliotheek voor foto's, video's en audio. Beide werken hetzelfde.",
      blocks: [
        {
          kind: "steps",
          title: "Bestanden uploaden",
          items: [
            "Klik rechtsboven op **Toevoegen** en kies **Bestanden uploaden**, of klik met de rechtermuisknop ergens op de pagina.",
            "Of sleep bestanden gewoon vanaf je computer naar het scherm: laat ze los op de pagina of op een map.",
            "Een hele map uploaden kan ook: kies **Map uploaden** of sleep de map naar het scherm.",
            "Rechtsonder in beeld zie je een **voortgangsbalk** met de naam van het bestand, het percentage en hoeveel er al is verstuurd. Staat er **Afronden…**, dan is het bestand bijna klaar. Blijf op de pagina tot er **Klaar** staat; bij een grote video kan dat even duren.",
          ],
        },
        {
          kind: "steps",
          title: "Mappen en submappen",
          items: [
            "Kies **Toevoegen → Nieuwe map** en geef de map een naam.",
            "Klik op een map om hem te openen. In een map kun je opnieuw **Nieuwe map** kiezen: zo maak je een **submap**. Je kunt maximaal 8 niveaus diep.",
            "Boven de lijst staat het mappad (bijvoorbeeld *Alle bestanden / Formulieren / 2026*). Klik op een onderdeel om daar terug te springen.",
            "Een map hernoemen of verwijderen doe je met de rechtermuisknop op de map. Bij verwijderen verdwijnen ook de submappen uit de app; de bestanden gaan terug naar **Alle bestanden** en blijven in Google Drive staan.",
          ],
        },
        {
          kind: "list",
          title: "Met een bestand werken (rechtermuisknop op het bestand, of de ⋮-knop)",
          items: [
            "**Openen:** Word- en Excel-bestanden bekijk je in de app; Excel-bestanden kun je ook bewerken. Je kunt ze ook openen in Google Documenten of Spreadsheets.",
            "**Hernoemen:** de naam verandert direct ook in Google Drive. De extensie (bijvoorbeeld .pdf) blijft gelijk.",
            "**Downloaden** — het bestand komt op je eigen apparaat.",
            "**Verwijderen:** het bestand gaat naar de prullenbak van Google Drive, dus je kunt het daar nog terughalen.",
          ],
        },
        {
          kind: "list",
          title: "Vinden en sorteren (zoals in Google Drive)",
          items: [
            "Zoek bovenaan op naam; er wordt dan in alle mappen gezocht.",
            "Filter op **Type**, **Mensen**, **Gewijzigd** en **Grootte**, en sorteer op naam, datum of grootte.",
            "Wissel tussen de **lijstweergave** en de **rasterweergave** met de knoppen rechts.",
          ],
        },
      ],
    },
    {
      id: "kalender",
      icon: "calendar",
      title: "Kalender",
      lead: "Alle zondagen, vergaderingen, kinderactiviteiten en vakanties op één plek.",
      blocks: [
        {
          kind: "list",
          title: "Weergaven",
          items: [
            "**Maand**, **Week** en **Agenda** (een lijst van wat eraan komt).",
            "**Feestdagen:** schoolvakanties en nationale feestdagen per schooljaar. Kies het schooljaar in het keuzemenu.",
            "In de maand- en weekweergave zijn schoolvakanties gekleurd en staan nationale feestdagen als labeltjes.",
          ],
        },
        {
          kind: "steps",
          title: "Een evenement toevoegen",
          items: [
            "Klik op **Nieuw Evenement**, of klik op een **dag** in de kalender en kies daar de optie om een evenement toe te voegen.",
            "Vul de titel in, kies het type (bijvoorbeeld Zondagsles, Leraarsvergadering, Kinderevenement) en eventueel tijd, plaats en omschrijving.",
            "Klik op **Evenement toevoegen**.",
          ],
        },
        {
          kind: "list",
          title: "Wijzigen en verwijderen",
          items: [
            "Klik op een evenement en kies **Bewerken** of **Verwijderen**. Dat mag een beheerder, of degene die het evenement heeft gemaakt.",
            "Evenementen die uit het **Rooster** komen, wijzig je op de roosterpagina.",
          ],
        },
        {
          kind: "steps",
          title: "Feestdagen en vakanties beheren",
          items: [
            "Open het tabblad **Feestdagen** en kies het schooljaar.",
            "Gebruik **Feestdag Toevoegen** voor een eigen dag, of **Importeer** om de officiële lijst van het schooljaar in één keer toe te voegen. Datums die al bestaan, worden overgeslagen.",
            "Datums met het label **Voorlopig** zijn nog niet zeker en kun je later aanpassen.",
          ],
        },
      ],
    },
    {
      id: "rooster",
      icon: "roster",
      title: "Rooster",
      lead: "Het rooster voor Zondagsschool en Jeugd: wie doet wat op welke zondag.",
      blocks: [
        {
          kind: "list",
          title: "Voor iedereen",
          items: [
            "Bekijk per zondag het thema, de leraren, de voorganger, liturgie en muziek.",
            "Klik op **Mijn Toewijzingen** om alleen te zien waarvoor jij bent ingedeeld.",
            "Filter op periode (van–tot, of de snelkeuzes zoals “Deze maand” en “Komende 3 maanden”), op persoon, of zoek op een woord.",
            "Met **Rooster Afdrukken** print je het rooster.",
          ],
        },
        {
          kind: "steps",
          title: "Voor leraren en beheerders: het rooster bijwerken",
          items: [
            "Klik op een cel om hem te bewerken: kies leraren, of vul thema, opmerkingen, soort dienst, voorganger, liturgie of muziek in. Alles wordt automatisch bewaard, net als in een spreadsheet.",
            "Wijzig je de datum van een rij, dan verschuift het bijbehorende evenement in de kalender mee.",
          ],
        },
        {
          kind: "steps",
          title: "Alleen voor beheerders: zondagen toevoegen en verwijderen",
          items: [
            "Voeg zondagen toe met **Rij Toevoegen**, **Volgende Zondag Toevoegen** of **Meerdere Zondagen Toevoegen** (kies de startdatum en het aantal weken).",
            "Met **Dupliceren** of **Verwijderen** op een rij kopieer of verwijder je een zondag. Elke rij heeft een bijbehorend evenement in de kalender (**Bekijk in Kalender**).",
          ],
        },
      ],
    },
    {
      id: "instellingen",
      icon: "settings",
      title: "Instellingen",
      lead: "Je eigen profiel en voorkeuren.",
      blocks: [
        {
          kind: "list",
          items: [
            "**Profiel:** je naam, e-mailadres, een optionele **gebruikersnaam** (waarmee je ook kunt inloggen) en een korte tekst over jezelf.",
            "**Weergave:** kies Licht of Donker.",
            "**Accentkleur:** je eigen kleur voor knoppen.",
            "**Meldingen:** zet per soort aan of uit — nieuwe lesplannen, portfolio-updates, reacties op je berichten, nieuwe agenda-afspraken, gebedsverzoeken en aankondigingen van beheerders.",
            "**Beveiliging → Wachtwoord Wijzigen:** vul je huidige en een nieuw wachtwoord in (minimaal 8 tekens).",
            "**Google Drive Opslag** (alleen beheerders): toont of de koppeling met Google Drive werkt.",
          ],
        },
        { kind: "tip", text: "Vergeet niet op **Wijzigingen Opslaan** te klikken als je je profiel hebt aangepast." },
      ],
    },
    {
      id: "beheer",
      icon: "admin",
      title: "Beheerpaneel",
      adminOnly: true,
      lead: "Alleen voor beheerders (menu **Beheer**). Hier regel je accounts, klassen en de veiligheid van de gegevens.",
      blocks: [
        {
          kind: "list",
          title: "De tabbladen",
          items: [
            "**Overzicht:** cijfers en grafieken over kinderen, klassen en gebruik.",
            "**Leraren:** accounts maken en beheren.",
            "**Klassen:** leeftijdsgroepen en klassen.",
            "**Moderatie & Logboeken:** berichten beheren en zien wie wat heeft gedaan.",
            "**Back-ups:** automatische en handmatige back-ups, met herstelmogelijkheid.",
          ],
        },
        {
          kind: "steps",
          title: "Een leraar toevoegen",
          items: [
            "Ga naar **Beheer → Leraren** en klik op **Leraaraccount Aanmaken**.",
            "Vul de naam en het e-mailadres in, eventueel een titel, en kies bij **Klas Toewijzen** de klas van de leraar. Klik op **Account Aanmaken**.",
            "De app toont één keer een **tijdelijk wachtwoord**. Geef dat door aan de leraar; die kiest bij de eerste keer inloggen een eigen wachtwoord.",
            "Met **Wachtwoord Resetten** maak je een nieuw eenmalig wachtwoord; met **Account Uitschakelen** blokkeer je een account zonder gegevens te verliezen.",
          ],
        },
        {
          kind: "steps",
          title: "Leeftijdsgroepen en klassen",
          items: [
            "Ga naar **Beheer → Klassen**.",
            "Maak eerst een **leeftijdsgroep** (bijvoorbeeld “Kleuters, 4–6”) met **Leeftijdsgroep Toevoegen**.",
            "Maak daarna een **klas** met **Klas Toevoegen**: naam, leeftijdsgroep en lokaal. Dit kan ook vanuit **Klas en Presentie**.",
            "Een klas met kinderen kun je niet verwijderen: verplaats of verwijder de kinderen eerst.",
          ],
        },
        {
          kind: "steps",
          title: "Back-ups",
          items: [
            "De app maakt elke nacht automatisch een back-up in de map “Backups” in de Google Drive van de gemeente. De laatste 30 dagen en 12 maanden worden bewaard.",
            "Op het tabblad **Back-ups** maak je met **Nu back-up maken** zelf een back-up, en met **Downloaden** sla je er een op je eigen computer op.",
            "Terugzetten: kies bij een back-up **Herstellen…** en bepaal wat je terugzet: één item (bijvoorbeeld één kind, les of evenement), één hele categorie, of alles. Bekijk wat er verandert en typ **RESTORE** ter bevestiging.",
            "Vlak vóór het terugzetten wordt automatisch een nieuwe back-up gemaakt, zodat je het kunt terugdraaien.",
          ],
        },
        { kind: "note", text: "Als er bij **Back-ups** een waarschuwing staat, werkt de koppeling met Google Drive niet meer. Ga naar Instellingen en koppel Google Drive opnieuw." },
      ],
    },
    {
      id: "problemen",
      icon: "faq",
      title: "Veelgestelde vragen",
      lead: "Iets werkt niet zoals je verwacht? Probeer dit eerst.",
      blocks: [
        {
          kind: "list",
          items: [
            "**Ik kan niet inloggen.** Controleer je e-mailadres of gebruikersnaam en wachtwoord. Gebruik anders **Wachtwoord vergeten?**. Blijft het niet lukken, vraag een beheerder om je wachtwoord te resetten.",
            "**Ik word steeds uitgelogd.** Dat gebeurt na 30 minuten zonder activiteit. Zet bij het inloggen **Ingelogd blijven** aan.",
            "**Een kind staat niet in de presentielijst.** Voeg het kind toe met **Nieuw kind toevoegen**, of controleer bij Kinderportfolio's of het kind in de juiste klas staat.",
            "**Ik zie een nieuwe pagina of wijziging niet.** Ververs de pagina (F5, of trek het scherm op een telefoon omlaag).",
            "**Een bestand opent niet in de app.** Download het, of open het in Google Documenten/Spreadsheets via het menu van het bestand.",
            "**Ik heb een presentie per ongeluk fout ingevuld.** Open de datum en kies **Aanwezigheid wijzigen**. Is het ouder dan 30 dagen, vraag dan een beheerder.",
            "**Ik heb een bestand verwijderd.** Het staat nog in de prullenbak van Google Drive; vraag een beheerder om het terug te zetten.",
            "**De app staat in het Engels.** Klik rechtsboven op de knop **US** om naar Nederlands (**NL**) te wisselen.",
          ],
        },
        { kind: "tip", text: "Kom je er niet uit? Vraag het aan DWKY AI of aan een beheerder." },
      ],
    },
  ],
};

const en: HelpContent = {
  ui: {
    eyebrow: "Help",
    title: "User guide",
    description: "Everything you need to use DWKY Connect — step by step, from signing in to making an attendance PDF.",
    print: "Print / save as PDF",
    searchPlaceholder: "Search the guide…",
    contents: "Contents",
    adminBadge: "Administrators only",
    noResultsTitle: "Nothing found",
    noResultsDescription: "Try another word, for example “password”, “attendance” or “folder”.",
    tipLabel: "Tip",
    noteLabel: "Note",
    printFooter: "DWKY Connect — User guide",
  },
  sections: [
    {
      id: "getting-started",
      icon: "rocket",
      title: "Getting started",
      lead: "DWKY Connect is the private workspace of the Sunday School and Youth ministry of the Duta Watjana Kids & Youth Committee. Everyone gets an account from an administrator; you can't register yourself.",
      blocks: [
        {
          kind: "steps",
          title: "Signing in",
          items: [
            "Go to dwky-connect.org.",
            "Enter your email address or username, and your password.",
            "Turn on **Keep me signed in** if you're on your own phone or computer.",
            "Click **Sign in**.",
          ],
        },
        {
          kind: "steps",
          title: "Forgot your password?",
          items: [
            "On the sign-in page, click **Forgot password?**.",
            "Enter your email or username and click **Send reset link**.",
            "Open the email and click the link. It works for 1 hour.",
            "Choose a new password (at least 8 characters).",
          ],
        },
        {
          kind: "list",
          title: "Good to know",
          items: [
            "Did an administrator give you a one-time password? The first time you sign in, the app asks you to choose your own.",
            "After **30 minutes** without activity you're signed out automatically. Just sign in again; what you saved is kept.",
            "The app works on computer, tablet and phone. On a phone, open the menu with the ☰ button at the top left.",
            "You can install the app on your phone or computer so it opens like a normal app: choose “Install” or “Add to home screen” in your browser.",
          ],
        },
        {
          kind: "list",
          title: "Who can do what?",
          items: [
            "**Teacher:** views and contributes — own class and attendance, child portfolios, lesson plans, updates, documents and media, calendar, and updating the roster.",
            "**Administrator:** can also manage classes and teachers, add or delete Sundays on the roster, see all classes, and use the Admin Panel (including backups).",
          ],
        },
      ],
    },
    {
      id: "basics",
      icon: "wrench",
      title: "The basics: language, dark mode, search and notifications",
      lead: "At the top of every screen there's a bar with buttons you'll use everywhere.",
      blocks: [
        {
          kind: "steps",
          title: "Changing the language (English ↔ Dutch)",
          items: [
            "Look at the button with the country code (**US** or **NL**) at the top right of the bar.",
            "Click it: the whole app switches language immediately.",
            "Your choice is remembered on this device.",
          ],
        },
        {
          kind: "steps",
          title: "Turning dark mode on or off",
          items: [
            "Click the **moon** or **sun icon** at the top right. A moon means: click to go dark; a sun: click to go light again.",
            "Or go to **Settings → Appearance** and choose **Light** or **Dark**.",
            "Your choice is remembered on this device and only applies to you; other users aren't affected.",
          ],
        },
        {
          kind: "steps",
          title: "Choosing your own accent colour",
          items: ["Go to **Settings → Accent color**.", "Pick a colour on the colour wheel or type a hex code.", "**Reset to default** takes you back to the original colour."],
        },
        {
          kind: "steps",
          title: "Searching everything",
          items: [
            "Click the search bar at the top, or press **Ctrl + K** (Mac: **⌘ + K**).",
            "Type a name or word. You'll see results from children, lesson plans, updates, documents, media and teachers.",
            "Click a result to go straight to it. **Esc** closes the search.",
          ],
        },
        {
          kind: "steps",
          title: "Notifications (the bell)",
          items: [
            "The bell shows new notifications, such as a published lesson plan, a comment or a prayer request.",
            "Click a notification to go to it.",
            "**Mark all read** removes the dots; **Clear all** empties the list.",
            "Choose which notifications you get under **Settings → Notifications**.",
          ],
        },
        {
          kind: "list",
          title: "Your profile menu and the yellow button",
          items: [
            "Click your initials at the top right for your profile menu: go to **Settings** or sign out.",
            "The yellow **New** button (on a phone: the round **+** button at the bottom right) is a shortcut to create a lesson plan, update or event, or to upload files.",
            "At the top of the menu on the left is the logo with **DWKY Connect**. Click it to always get back to the Dashboard.",
          ],
        },
      ],
    },
    {
      id: "dashboard",
      icon: "home",
      title: "Dashboard",
      lead: "Your home screen: what's going on at a glance.",
      blocks: [
        {
          kind: "list",
          items: [
            "A welcome banner with the **Verse of the Day**.",
            "**Upcoming calendar** and events.",
            "**Recent teacher updates**.",
            "**Recently updated portfolios** and an overview of the classes.",
          ],
        },
        { kind: "tip", text: "Click a block or card to go straight to the matching page." },
      ],
    },
    {
      id: "class-and-attendance",
      icon: "class",
      title: "Class & Attendance",
      lead: "See your class here and keep track of who was there each Sunday. Administrators see all classes.",
      blocks: [
        {
          kind: "list",
          title: "What do you see here?",
          items: [
            "**Teacher:** your own class with the number of children, lesson plans, the room, the attendance, the class roster and your lesson plans.",
            "**Administrator:** an overview of all classes. Click a class to open it.",
          ],
        },
        {
          kind: "steps",
          title: "Registering the attendance of a Sunday",
          items: [
            "Open **Class & Attendance**. The date is set to today; pick another date to fill in an earlier Sunday.",
            "Click **+ Register attendance**.",
            "A list of the class opens. **Tick the children who were there.** Everyone you don't tick is automatically absent.",
            "Lots of children? Type part of a name in the search box. **Select all** and **Clear** tick or untick everyone at once.",
            "A child missing from the list? Click **Add new child** (see below).",
            "Optionally enter the number of **visitors** (children who aren't on the class list) and a **note**.",
            "Click **Save attendance**.",
          ],
        },
        {
          kind: "steps",
          title: "Adding a new child while taking attendance",
          items: [
            "In the list, click **Add new child**.",
            "Enter the **name**. Nothing else is required; you can add the birthday, guardian and allergies later.",
            "Click **Add Child**. The child is in the class straight away, ticked as present, and also appears in **Children Portfolios**.",
          ],
        },
        {
          kind: "steps",
          title: "Viewing or changing a saved register",
          items: [
            "Choose the date: you see who was present.",
            "Click **+ Change attendance** to correct something (for example “Hanna was there after all”).",
            "Or click a date in the **Attendance overview** (below): that Sunday opens at the top.",
          ],
        },
        {
          kind: "list",
          title: "Attendance overview of all Sundays",
          items: [
            "Below the register is a table with the children down the side and the Sundays across. A **tick** means present. Children who weren't present on any of the Sundays shown aren't listed.",
            "On the right you see how often each child was there (for example 5/8) and the percentage. At the bottom: the number of children present and visitors per Sunday.",
            "By default you see the last 8 Sundays. Use the drop-down at the top right to see the last 16 or all Sundays.",
          ],
        },
        {
          kind: "steps",
          title: "Making a PDF of the attendance",
          items: [
            "**One Sunday:** click the PDF icon under the date in the table.",
            "**A selection:** tick the Sundays you want under the dates and choose **Make PDF → Selected Sundays**.",
            "**Everything:** choose **Make PDF → All Sundays**.",
            "The PDF is downloaded. For one Sunday it's a list of the names present; for more Sundays it's a table of ticks, landscape, over several pages if there are many Sundays.",
          ],
        },
        { kind: "note", text: "Teachers can fill in or change a register up to 30 days back. For older Sundays an administrator is needed." },
        {
          kind: "steps",
          title: "For administrators: opening, editing and creating classes",
          items: [
            "Click a class card to open the class. **← Back to all classes** takes you back.",
            "Click **Edit class** to change the name, age group or room.",
            "Click **New class** to create a class; the new class then opens straight away. An age group must exist first (see Admin Panel).",
          ],
        },
        { kind: "tip", text: "You can also give the attendance to DWKY AI, for example: “Present today: Anna, Ben and Chloë”. See the DWKY AI chapter." },
      ],
    },
    {
      id: "children",
      icon: "children",
      title: "Children Portfolios",
      lead: "Each child's file: details, work, photos, growth and attendance — in one place.",
      blocks: [
        {
          kind: "steps",
          title: "Finding or adding a child",
          items: [
            "Open **Children Portfolios**. Search by name, or pick a class at the top under **All Classes**.",
            "Click a card to open the child's portfolio.",
            "Add a new child with **Add Child**. Only the name and class are required; the birthday can be filled in later.",
          ],
        },
        {
          kind: "steps",
          title: "Changing a child's details",
          items: [
            "Open the portfolio and click **Edit**.",
            "Change the name, birthday, class (administrators only), guardian, address or allergies. The age is calculated automatically.",
            "Click **Save Changes**.",
          ],
        },
        {
          kind: "list",
          title: "The tabs in a portfolio",
          items: [
            "**Overview:** recent work, milestones and the guardian's contact details.",
            "**Artwork, Photos, Videos, Documents:** add work with the button at the top right of the tab. Files go to the church's Google Drive.",
            "**Spiritual Growth:** milestones such as a memorised verse, prayer or kindness.",
            "**Observations:** short notes from teachers about the child.",
            "**Attendance:** how often the child comes, the latest Sundays, and a heads-up if the child has been away for several weeks.",
          ],
        },
        { kind: "note", text: "Only an administrator can delete a portfolio (**Delete Portfolio** button). This can't be undone." },
      ],
    },
    {
      id: "lessons",
      icon: "lessons",
      title: "Lesson Plans",
      lead: "Create, save and publish lesson plans per age group.",
      blocks: [
        {
          kind: "steps",
          title: "Making a lesson plan",
          items: [
            "Open **Lesson Plans** and click **New Lesson** (or first pick a **Template**: Bible story, Memory verse, VBS/special event or blank).",
            "Fill in the details: title, Bible passage, theme, age group, memory verse, learning objectives, opening activity, Bible story, discussion questions, craft, songs, closing prayer and homework.",
            "Optionally add attachments, such as a PDF, Word file, image or YouTube link.",
            "Save it as a **draft** (only you see it) or **publish** it (the whole team sees it and gets a notification).",
          ],
        },
        {
          kind: "list",
          title: "Afterwards",
          items: [
            "Filter at the top by **All**, **Published** or **Drafts**, and by age group.",
            "Open a lesson to read it. **Edit Lesson** changes it; **Move to Draft** or **Publish Now** changes its status.",
            "**Version History** shows earlier versions of the lesson.",
          ],
        },
        { kind: "tip", text: "Need an idea? Ask DWKY AI: “Create a lesson about forgiveness for children aged 8 to 10.”" },
      ],
    },
    {
      id: "bible",
      icon: "bible",
      title: "Bible",
      lead: "Read the Bible in the app, with the Verse of the Day.",
      blocks: [
        {
          kind: "steps",
          title: "Reading and highlighting verses",
          items: [
            "Open **Bible** and on the **Read** tab choose a book, chapter and version.",
            "Tap a verse and choose a colour to highlight it.",
            "All your highlighted verses are under **Saved Verses**. **Open in Reader** takes you back to that spot.",
          ],
        },
        { kind: "note", text: "Highlights are personal: only you see them. If it says the Bible reader isn't connected yet, ask an administrator to set it up." },
      ],
    },
    {
      id: "ai",
      icon: "ai",
      title: "DWKY AI",
      lead: "A digital assistant that helps with lesson preparation and can do things in the app for you.",
      blocks: [
        {
          kind: "steps",
          title: "Starting a conversation",
          items: [
            "Open **DWKY AI**. The first time, read the short notice and click **I Understand & Continue**.",
            "Type your question at the bottom and send it. You can also click one of the example questions.",
            "**New Conversation** starts fresh. Earlier conversations are on the left; you can rename or delete them.",
          ],
        },
        {
          kind: "list",
          title: "What can you ask?",
          items: [
            "**Lesson preparation:** “Give me 5 activities for children aged 8–10”, “Explain Psalm 51:12 for children”.",
            "**Getting things done:** “Add a Teacher Meeting to the calendar on Friday at 19:30”, “What is on the calendar this month?”.",
            "**Giving attendance:** “Present today: Anna, Ben, Chloë” — everyone you don't mention is recorded as absent. You can correct it too: “Hanna was present after all.”",
            "**Looking things up:** “Who wasn't here last week?”, “How often does Ben come?”.",
          ],
        },
        {
          kind: "note",
          text: "Before deleting anything (an event, child, document…), DWKY AI always asks for your confirmation first: click **Confirm** or **Cancel**. The AI can make mistakes: always check lesson material and Bible texts yourself.",
        },
      ],
    },
    {
      id: "updates",
      icon: "updates",
      title: "Updates & Encouragement",
      lead: "The team's notice board: announcements, devotionals, prayer requests and photos.",
      blocks: [
        {
          kind: "steps",
          title: "Sharing something",
          items: [
            "Open **Updates & Encouragement** and type your message in the box at the top.",
            "Want to include a photo? Click **Attach a photo**. Want to ask the team something? Click **Add poll** and fill in the question and options.",
            "Click **Post**.",
          ],
        },
        {
          kind: "list",
          title: "Responding",
          items: [
            "React with an emoji, or write a comment.",
            "On a prayer request, click **I prayed for this**, so the other person knows they were prayed for.",
            "Vote in a poll by clicking an option.",
            "Administrators can **pin** posts (they then appear at the top, under “Pinned”) or remove them.",
          ],
        },
      ],
    },
    {
      id: "files",
      icon: "files",
      title: "Documents and Media Library",
      lead: "Shared team files, stored in the church's Google Drive and neatly organised in folders. Documents is for PDF, Word and Excel files; Media Library for photos, videos and audio. Both work the same way.",
      blocks: [
        {
          kind: "steps",
          title: "Uploading files",
          items: [
            "Click **Add** at the top right and choose **Upload files**, or right-click anywhere on the page.",
            "Or simply drag files from your computer onto the screen: drop them on the page or on a folder.",
            "You can upload a whole folder too: choose **Upload folder** or drag the folder onto the screen.",
            "At the bottom right you'll see a **progress bar** with the file name, the percentage and how much has been sent. When it says **Finishing…** the file is almost done. Stay on the page until it says **Done**; a large video can take a while.",
          ],
        },
        {
          kind: "steps",
          title: "Folders and subfolders",
          items: [
            "Choose **Add → New folder** and give the folder a name.",
            "Click a folder to open it. Inside a folder you can choose **New folder** again: that makes a **subfolder**. You can go up to 8 levels deep.",
            "Above the list is the folder path (for example *All files / Forms / 2026*). Click any part to jump back there.",
            "Rename or delete a folder by right-clicking it. When you delete it, its subfolders disappear from the app too; the files go back to **All files** and stay in Google Drive.",
          ],
        },
        {
          kind: "list",
          title: "Working with a file (right-click the file, or the ⋮ button)",
          items: [
            "**Open:** you view Word and Excel files in the app; Excel files can also be edited. You can also open them in Google Docs or Sheets.",
            "**Rename:** the name changes in Google Drive too, straight away. The extension (for example .pdf) stays the same.",
            "**Download** — the file is saved to your own device.",
            "**Delete:** the file goes to the Google Drive trash, so you can still recover it there.",
          ],
        },
        {
          kind: "list",
          title: "Finding and sorting (like Google Drive)",
          items: [
            "Search by name at the top; this searches all folders.",
            "Filter by **Type**, **People**, **Modified** and **Size**, and sort by name, date or size.",
            "Switch between **list view** and **grid view** with the buttons on the right.",
          ],
        },
      ],
    },
    {
      id: "calendar",
      icon: "calendar",
      title: "Calendar",
      lead: "All Sundays, meetings, children's events and holidays in one place.",
      blocks: [
        {
          kind: "list",
          title: "Views",
          items: [
            "**Month**, **Week** and **Agenda** (a list of what's coming up).",
            "**Holidays:** school vacations and national holidays per school year. Choose the school year in the drop-down.",
            "In the month and week views, school vacations are tinted and national holidays appear as small labels.",
          ],
        },
        {
          kind: "steps",
          title: "Adding an event",
          items: [
            "Click **New Event**, or click a **day** in the calendar and choose the option there to add an event.",
            "Enter the title, choose the type (for example Sunday Lesson, Teacher Meeting, Children Event) and optionally the time, location and description.",
            "Click **Add Event**.",
          ],
        },
        {
          kind: "list",
          title: "Changing and deleting",
          items: [
            "Click an event and choose **Edit** or **Delete**. An administrator or the person who created the event can do this.",
            "Events that come from the **Roster** are changed on the roster page.",
          ],
        },
        {
          kind: "steps",
          title: "Managing holidays and vacations",
          items: [
            "Open the **Holidays** tab and choose the school year.",
            "Use **Add Holiday** for your own day, or **Import** to add the official list for the school year in one go. Dates that already exist are skipped.",
            "Dates labelled **Provisional** aren't certain yet and can be changed later.",
          ],
        },
      ],
    },
    {
      id: "roster",
      icon: "roster",
      title: "Roster",
      lead: "The roster for Sunday School and Youth: who does what on which Sunday.",
      blocks: [
        {
          kind: "list",
          title: "For everyone",
          items: [
            "See the theme, teachers, preacher, liturgy and music per Sunday.",
            "Click **My Assignments** to see only what you're assigned to.",
            "Filter by period (from–to, or the shortcuts such as “This month” and “Next 3 months”), by person, or search for a word.",
            "**Print Roster** prints the roster.",
          ],
        },
        {
          kind: "steps",
          title: "For teachers and administrators: updating the roster",
          items: [
            "Click a cell to edit it: pick teachers, or fill in the theme, notes, service type, preacher, liturgy or music. Everything is saved automatically, just like a spreadsheet.",
            "If you change the date of a row, its matching calendar event moves with it.",
          ],
        },
        {
          kind: "steps",
          title: "Administrators only: adding and deleting Sundays",
          items: [
            "Add Sundays with **Add Row**, **Add Next Sunday** or **Add Multiple Sundays** (pick the start date and number of weeks).",
            "**Duplicate** or **Delete** on a row copies or removes a Sunday. Every row has a matching event in the calendar (**View in Calendar**).",
          ],
        },
      ],
    },
    {
      id: "settings",
      icon: "settings",
      title: "Settings",
      lead: "Your own profile and preferences.",
      blocks: [
        {
          kind: "list",
          items: [
            "**Profile:** your name, email, an optional **username** (which you can also sign in with) and a short text about yourself.",
            "**Appearance:** choose Light or Dark.",
            "**Accent color:** your own colour for buttons.",
            "**Notifications:** switch each kind on or off — new lesson plans, portfolio updates, replies to your posts, new calendar events, prayer requests and administrator announcements.",
            "**Security → Change Password:** enter your current and a new password (at least 8 characters).",
            "**Google Drive Storage** (administrators only): shows whether the link to Google Drive works.",
          ],
        },
        { kind: "tip", text: "Don't forget to click **Save Changes** after changing your profile." },
      ],
    },
    {
      id: "admin",
      icon: "admin",
      title: "Admin Panel",
      adminOnly: true,
      lead: "For administrators only (menu **Admin**). Here you manage accounts, classes and the safety of the data.",
      blocks: [
        {
          kind: "list",
          title: "The tabs",
          items: [
            "**Overview:** figures and charts about children, classes and usage.",
            "**Teachers:** create and manage accounts.",
            "**Classes:** age groups and classes.",
            "**Moderation & Logs:** manage posts and see who did what.",
            "**Backups:** automatic and manual backups, with restore.",
          ],
        },
        {
          kind: "steps",
          title: "Adding a teacher",
          items: [
            "Go to **Admin → Teachers** and click **Create Teacher Account**.",
            "Enter the name and email address, optionally a title, and choose the teacher's class under **Assign Class**. Click **Create Account**.",
            "The app shows a **temporary password** once. Pass it on to the teacher; they choose their own password the first time they sign in.",
            "**Reset Password** creates a new one-time password; **Disable Account** blocks an account without losing any data.",
          ],
        },
        {
          kind: "steps",
          title: "Age groups and classes",
          items: [
            "Go to **Admin → Classes**.",
            "First create an **age group** (for example “Kindergarten, 4–6”) with **Add Age Group**.",
            "Then create a **class** with **Add Class**: name, age group and room. You can also do this from **Class & Attendance**.",
            "A class with children can't be deleted: move or remove the children first.",
          ],
        },
        {
          kind: "steps",
          title: "Backups",
          items: [
            "Every night the app automatically makes a backup in the “Backups” folder of the church's Google Drive. The last 30 days and 12 months are kept.",
            "On the **Backups** tab, **Back up now** makes one yourself and **Download** saves one to your own computer.",
            "Restoring: choose **Restore…** on a backup and decide what to restore: a single item (for example one child, lesson or event), a whole category, or everything. Review what will change and type **RESTORE** to confirm.",
            "Right before restoring, a fresh backup is made automatically so you can undo it.",
          ],
        },
        { kind: "note", text: "If **Backups** shows a warning, the link to Google Drive has stopped working. Go to Settings and connect Google Drive again." },
      ],
    },
    {
      id: "troubleshooting",
      icon: "faq",
      title: "Frequently asked questions",
      lead: "Something not working as you expect? Try this first.",
      blocks: [
        {
          kind: "list",
          items: [
            "**I can't sign in.** Check your email or username and password. Otherwise use **Forgot password?**. If it still fails, ask an administrator to reset your password.",
            "**I keep getting signed out.** That happens after 30 minutes without activity. Turn on **Keep me signed in** when signing in.",
            "**A child isn't in the attendance list.** Add the child with **Add new child**, or check in Children Portfolios that the child is in the right class.",
            "**I don't see a new page or change.** Refresh the page (F5, or pull down on a phone).",
            "**A file won't open in the app.** Download it, or open it in Google Docs/Sheets from the file's menu.",
            "**I filled in an attendance wrongly.** Open the date and choose **Change attendance**. If it's older than 30 days, ask an administrator.",
            "**I deleted a file.** It's still in the Google Drive trash; ask an administrator to restore it.",
            "**The app is in Dutch.** Click the **NL** button at the top right to switch to English (**US**).",
          ],
        },
        { kind: "tip", text: "Still stuck? Ask DWKY AI or an administrator." },
      ],
    },
  ],
};

export const helpContent: Record<Language, HelpContent> = { nl, en };
