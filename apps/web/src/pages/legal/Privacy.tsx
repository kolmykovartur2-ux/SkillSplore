import { LegalLayout } from './LegalLayout.js';

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="23 July 2026">
      <h2>1. Who this applies to</h2>
      <p>
        This policy explains how SkillSplore (“we”, “us”) collects, uses and protects personal
        information about learners, providers and visitors. It should be read together with our
        Terms of Service.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, password (stored only as a hash), and role.</li>
        <li><strong>Profile data:</strong> for providers — biography, subjects or skills, rates, availability, location, and uploaded qualification documents.</li>
        <li><strong>Activity data:</strong> learning requests, responses, messages, engagements, reviews and reports you create.</li>
        <li><strong>Technical data:</strong> session information and basic logs needed to operate and secure the service.</li>
      </ul>
      <p>We do not collect payment card details, because payments are arranged directly between learners and providers, off the platform.</p>

      <h2>3. How we use it</h2>
      <ul>
        <li>to operate the platform — create profiles, run search, deliver messages and notifications;</li>
        <li>to review and verify provider applications and qualifications;</li>
        <li>to keep the platform safe — moderation, handling reports, and preventing abuse;</li>
        <li>to communicate service and account information to you;</li>
        <li>to meet legal obligations.</li>
      </ul>

      <h2>4. What is visible to others</h2>
      <p>
        Approved provider profiles (name, headline, subjects or skills, rates, reviews and trust
        indicators) are publicly visible. Uploaded qualification documents are private and are
        accessible only to you and to administrators for verification. Messages are visible only to
        the participants in a conversation and, where necessary, to moderators investigating a
        report. Your email address and password are never shown to other users.
      </p>

      <h2>5. Sharing</h2>
      <p>
        We do not sell your personal information. We share it only with service providers that help
        us operate the platform (for example, hosting, email delivery and file storage), and where
        required by law. These providers are chosen so the platform remains portable and can be
        self-hosted by its operator.
      </p>

      <h2>6. Storage and security</h2>
      <p>
        Data is stored in a standard PostgreSQL database and object storage controlled by the
        platform operator. We apply measures including hashed passwords, server-side sessions,
        access controls for private documents, input validation, rate limiting and audit logging.
        No system is perfectly secure; independent security review is part of the platform’s
        production-readiness plan.
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep personal data for as long as your account is active. When you delete your account,
        we remove or anonymise your personal information while preserving the integrity of records
        that others rely on (such as messages and reviews visible to the other party). Some records
        may be retained where required by law.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, export or delete your
        personal data, and to object to or restrict certain processing. You can edit or delete your
        account from your account settings, and request an export of your data from the platform
        operator. <em>[Specific statutory rights and response timelines to be confirmed during
        professional privacy review.]</em>
      </p>

      <h2>9. Children</h2>
      <p>
        Learning services are often used by or for minors. Where a user is a minor, a parent or
        guardian is responsible for consent and supervision. We ask that accounts for children are
        created and managed by a responsible adult.
      </p>

      <h2>10. Changes and contact</h2>
      <p>
        We may update this policy; material changes will be notified through the platform. For
        privacy questions or to exercise your rights, contact the platform operator’s published
        privacy contact.
      </p>
    </LegalLayout>
  );
}
