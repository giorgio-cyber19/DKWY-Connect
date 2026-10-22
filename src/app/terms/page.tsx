import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, H2, UL, LEGAL_ORG, LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — DWKY Connect",
  description: "The terms for using DWKY Connect, the private Sunday School ministry tool of the Duta Watjana Kids & Youth Committee.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply to your use of DWKY Connect (&ldquo;the app&rdquo;, at dwky-connect.org), the private Sunday School and youth ministry tool run
        by the {LEGAL_ORG}. By signing in you agree to them. If you do not agree, please do not use the app.
      </p>

      <H2>1. Who may use the app</H2>
      <p>
        The app is for teachers, volunteers and administrators of the ministry. There is no public registration: an administrator creates your account
        and may disable it at any time. You must be authorised by the ministry to use it.
      </p>

      <H2>2. Your account</H2>
      <UL>
        <li>Keep your password private and use a strong, unique one. Do not share your account.</li>
        <li>Sign out on shared computers. You are signed out automatically after 30 minutes of inactivity.</li>
        <li>Tell an administrator immediately if you think someone else has accessed your account.</li>
      </UL>

      <H2>3. Acceptable use</H2>
      <p>Use the app only for the ministry&rsquo;s work. You must not:</p>
      <UL>
        <li>post or upload anything unlawful, abusive, harassing, discriminatory or otherwise inappropriate for a children&rsquo;s ministry;</li>
        <li>access, copy or share information about children or families except as needed for your role, or outside the ministry;</li>
        <li>try to break into the app, bypass its security, overload it, or access another person&rsquo;s account or data;</li>
        <li>upload malicious files or content you do not have the right to share.</li>
      </UL>

      <H2>4. Information about children</H2>
      <p>
        Information about children and families is sensitive. Handle it with care, record only what is needed for the ministry, treat it as
        confidential, and follow the ministry&rsquo;s safeguarding rules. Do not take it out of the app (for example by screenshots or downloads) except
        where your role requires it, and then store it securely. Our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>{" "}
        explains how the app itself handles information.
      </p>

      <H2>5. Your content</H2>
      <p>
        You remain responsible for the lessons, posts, comments, files and other content you add. By adding it you allow the ministry to store, display and
        use it within the app for its work. Administrators may remove content that breaks these terms.
      </p>

      <H2>6. DWKY AI assistant</H2>
      <p>
        The AI assistant can make mistakes — it may misunderstand Scripture or give inaccurate information. It is a preparation aid, not a replacement for
        Bible study or your own judgement; always review what it produces before teaching, and check the result of any action it takes for you. It
        performs actions only with your own permissions and asks you to confirm before deleting.
      </p>

      <H2>7. Google Drive</H2>
      <p>
        Uploaded files are stored in a Google Drive account connected by an administrator. Making files available through the app&rsquo;s &ldquo;Open in
        Google Sheets/Docs&rdquo; feature makes those files accessible to anyone who has their link, so share links with care.
      </p>

      <H2>8. Availability and changes</H2>
      <p>
        We work to keep the app available and to back up its data, but it is provided &ldquo;as is&rdquo;, without a guarantee that it will always be
        available, error-free or that nothing will ever be lost. We may change, suspend or stop the app, or change these terms, at any time. If we change
        the terms we will update the date above.
      </p>

      <H2>9. Ending access</H2>
      <p>
        An administrator may suspend or remove your account if you break these terms or no longer serve in the ministry. You may stop using the app at any
        time; ask an administrator if you want your account removed.
      </p>

      <H2>10. Liability</H2>
      <p>
        To the extent permitted by law, the ministry and its volunteers are not liable for indirect or consequential loss arising from the use of, or
        inability to use, the app. Nothing in these terms limits any liability that cannot be limited by law.
      </p>

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
