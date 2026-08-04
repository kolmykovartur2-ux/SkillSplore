import { Link } from 'react-router-dom';
import { Card } from '../../components/ui.js';

/**
 * Contact routes, listed by purpose.
 *
 * The addresses themselves are placeholders until the founder supplies real
 * ones. They are shown in the placeholder form rather than substituted with a
 * plausible-looking address, so nobody emails a mailbox that does not exist
 * and assumes their complaint was received.
 */
export function Contact() {
  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
        <strong>Draft.</strong> The contact addresses below have not been set up yet. They are shown
        in placeholder form deliberately, so that nobody writes to an address that does not exist.
      </div>

      <Card>
        <div className="card-body legal-doc">
          <h1>Contact SkillSplore</h1>

          <h2>Support</h2>
          <p>
            Questions about using the platform, or a problem with your account.<br />
            <code>admin@skillsplore.org</code>
          </p>

          <h2>Privacy</h2>
          <p>
            Access, correction, deletion, consent withdrawal, and privacy complaints. Our Privacy
            Officer is <code>[[PRIVACY_OFFICER_NAME]]</code>.<br />
            <code>admin@skillsplore.org</code>
          </p>
          <p className="muted">
            For most privacy matters the fastest route is the{' '}
            <Link to="/privacy-request">privacy request form</Link>, which records your request
            directly rather than relying on an inbox.
          </p>

          <h2>Security</h2>
          <p>
            Vulnerability reports and suspected security incidents. Please do not post security
            issues publicly before contacting us.<br />
            <code>admin@skillsplore.org</code>
          </p>

          <h2>Disputes</h2>
          <p>
            Formal complaints and disputes under the{' '}
            <Link to="/terms">Terms of Use</Link>.<br />
            <code>admin@skillsplore.org</code>
          </p>

          <h2>Postal</h2>
          <p>
            <code>[[LEGAL_ENTITY_NAME]]</code><br />
            <code>[[REGISTERED_ADDRESS]]</code>
          </p>

          <div className="divider" />

          <h2>Reporting something urgent</h2>
          <p>
            <strong>If someone is in immediate danger, contact your local emergency services
            first.</strong> If you are worried about the safety of a child, contact your local
            police or child protection authority, and then tell us.
          </p>
          <p>
            For anything on the platform — a profile, a message, a review, a request — use the
            report button attached to it. That reaches the moderation queue with the surrounding
            context attached, which an email does not.
          </p>
        </div>
      </Card>
    </div>
  );
}
