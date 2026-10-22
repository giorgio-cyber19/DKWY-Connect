import type { Metadata } from "next";
import { LegalPage, H2, UL, LEGAL_ORG, LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — DWKY Connect",
  description: "How DWKY Connect, the private Sunday School ministry tool of the Duta Watjana Kids & Youth Committee, handles personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        DWKY Connect (&ldquo;the app&rdquo;, at dwky-connect.org) is a private tool used by the {LEGAL_ORG} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) to run its
        Sunday School and youth ministry: lesson planning, class and attendance records, child portfolios, a team news feed, a shared document and media
        library, a calendar and a teaching roster. It is not open to the public — accounts are created by a ministry administrator for teachers and
        volunteers. This policy explains what information the app handles and why.
      </p>

      <H2>1. Information we handle</H2>
      <UL>
        <li>
          <strong>Account information of teachers and administrators:</strong> name, email address, optional username, role, class, title and short bio,
          and a one-way (hashed) password. Passwords are never stored in readable form.
        </li>
        <li>
          <strong>Information about children and families</strong>, entered by authorised ministry staff: the child&rsquo;s name, age or birthday, class,
          guardian names and contact details, address, allergies or medical notes, spiritual milestones, teacher observations, attendance records, and
          any artwork, photos, videos or documents added to a child&rsquo;s portfolio.
        </li>
        <li>
          <strong>Ministry content:</strong> lesson plans, posts, comments, polls, prayer requests, calendar events, holidays, rosters, and files in the
          Documents and Media libraries.
        </li>
        <li>
          <strong>Your activity in the app:</strong> an activity log of administrative actions (for example &ldquo;created a class&rdquo;), your
          notifications, your Bible verse highlights, your DWKY AI conversations, and your display preferences.
        </li>
        <li>
          <strong>Technical data</strong> that our hosting provider records when you use the app, such as IP address and request logs, used for security and
          to keep the service running.
        </li>
      </UL>

      <H2>2. How we use it</H2>
      <p>
        Only to run the ministry through the app: to let teachers prepare lessons and care for the children in their class, to take attendance, to
        communicate within the team, to send account emails (password resets and notifications of new posts), to keep the app secure, and to
        keep backups. We do not sell personal information, we do not show advertising, and we do not use analytics or advertising trackers.
      </p>

      <H2>3. Google Drive and Google user data</H2>
      <p>
        An administrator connects one Google account to the app so that uploaded files are stored in that account&rsquo;s Google Drive. The app requests
        only the narrow <code>drive.file</code> permission. This lets it create, read, update and delete <strong>only the files and folders the app
        itself created</strong> (in a folder named &ldquo;DWKY Connect Files&rdquo;, including a private &ldquo;Backups&rdquo; folder). It cannot see
        any other file in that Google account.
      </p>
      <UL>
        <li>The connection is kept as an encrypted authorisation token in our database; your Google password is never seen or stored by the app.</li>
        <li>Google data is used solely to store, show, download and back up the ministry&rsquo;s own files inside the app.</li>
        <li>We do not use Google user data for advertising, we do not sell it, and we do not allow people to read it other than signed-in members of the ministry using the app, or as required by law or for security.</li>
        <li>
          Files deleted in the app are moved to the Google Drive trash, where Google keeps them for about 30 days before removing them.
        </li>
        <li>
          You can disconnect the app at any time in the Admin Panel, or revoke its access at{" "}
          <a className="underline" href="https://myaccount.google.com/permissions" rel="noopener noreferrer">
            myaccount.google.com/permissions
          </a>
          .
        </li>
      </UL>
      <p>
        DWKY Connect&rsquo;s use and transfer of information received from Google APIs adheres to the{" "}
        <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <H2>4. Service providers that process data for us</H2>
      <UL>
        <li><strong>Vercel</strong> — hosts the app and its servers.</li>
        <li><strong>Upstash</strong> — the database that stores the app&rsquo;s records (accounts, children, lessons, posts, attendance and so on).</li>
        <li><strong>Google Drive</strong> — file storage and backups, as described above.</li>
        <li><strong>Resend</strong> — delivers the app&rsquo;s emails (it receives the recipient&rsquo;s name and email address and the email text).</li>
        <li>
          <strong>Google Gemini</strong> — powers the DWKY AI assistant (see section 5).
        </li>
        <li>
          <strong>YouVersion</strong> — supplies Bible text for the Bible reader and verse of the day; it operates under its own privacy policy.
        </li>
      </UL>
      <p>We do not share personal information with anyone else, except if the law requires it or to protect the safety of a child or the security of the app.</p>

      <H2>5. DWKY AI assistant</H2>
      <p>
        The optional DWKY AI assistant sends the messages you type to Google&rsquo;s Gemini service to generate replies. When you ask it to look something
        up or do something in the app (for example &ldquo;who was absent last week?&rdquo;), the relevant information from the app — such as the names
        of children in your class, calendar entries or lesson text — is included in that request so it can answer. It acts only with your own permissions
        and asks for confirmation before deleting anything. Your conversations are stored in the app so you can come back to them, and you can delete
        them. Do not type information into the assistant that you would not want processed by Google under its own terms. The app never sends account passwords to
        the assistant.
      </p>

      <H2>6. Backups and how long we keep information</H2>
      <p>
        A full copy of the app&rsquo;s data is saved automatically every night to the private Backups folder in Google Drive. We keep the last 30 days of
        backups plus one backup per month for the last 12 months; older backups are deleted. Because backups contain a copy of the records, information
        you delete in the app can remain in a backup for up to that period. Otherwise information is kept for as long as it is needed for the ministry
        or until an administrator deletes it. Password-reset links expire after one hour, and you are signed out automatically after 30 minutes of
        inactivity.
      </p>

      <H2>7. Security</H2>
      <p>
        The app is served over HTTPS; passwords are hashed; sign-in attempts are rate-limited; access to children&rsquo;s information requires a signed-in
        account; and administrators control who has an account. No system is perfectly secure, so please use a strong, unique password and sign out on
        shared computers.
      </p>

      <H2>8. Children&rsquo;s information</H2>
      <p>
        Information about children is entered only by authorised ministry staff and is visible only to signed-in teachers and administrators. Children
        do not have accounts and cannot use the app. The ministry is responsible for having the appropriate permission from parents or guardians for the
        information it records, and will correct or remove a child&rsquo;s information on a parent or guardian&rsquo;s request.
      </p>

      <H2>9. Your choices and rights</H2>
      <p>
        You can ask us what information we hold about you or your child, ask us to correct it, or ask us to delete it, and where the law of your country
        gives you further rights (such as objecting to processing or receiving a copy of your data) you may exercise them too. Email us at the address
        below; an administrator will respond. You can also edit your own profile and delete your own AI conversations inside the app.
      </p>

      <H2>10. Changes to this policy</H2>
      <p>If we change this policy we will update the date at the top of this page, and for significant changes tell the app&rsquo;s users.</p>

      <H2>11. Contact</H2>
      <p>
        {LEGAL_ORG} —{" "}
        <a className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      </p>
    </LegalPage>
  );
}
