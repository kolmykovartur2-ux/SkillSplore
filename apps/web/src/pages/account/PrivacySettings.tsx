import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { Alert, Button, Card } from '../../components/ui.js';
import { useToast } from '../../lib/toast.js';

interface ConsentOption {
  kind: 'MARKETING_EMAIL' | 'DATA_INSIGHTS' | 'ANALYTICS_COOKIES';
  available: boolean;
  granted: boolean;
  grantedAt: string | null;
  version: string | null;
  versionId: number | null;
  wording: string | null;
  purpose: string | null;
  dataCategories: string[];
  excludedCategories: string[];
  recipientCategories: string[];
  countries: string[];
  retentionSummary: string | null;
  withdrawalSummary: string | null;
  recipientsMustDeleteOnWithdrawal: boolean;
  priorDisclosuresReversible: boolean;
}

interface Acceptance {
  slug: string;
  title: string;
  version: string;
  acceptedAt: string;
  method: string;
}

const KIND_LABELS: Record<ConsentOption['kind'], string> = {
  MARKETING_EMAIL: 'Marketing email',
  DATA_INSIGHTS: 'Data Insights Programme',
  ANALYTICS_COOKIES: 'Analytics cookies',
};

const CATEGORY_LABELS: Record<string, string> = {
  children_information: "children's information",
  private_messages: 'private messages',
  identity_documents: 'identity documents',
  payment_credentials: 'payment credentials',
  health_information: 'health information',
  disability_information: 'disability information',
  precise_location: 'precise location',
  government_identifiers: 'government identifiers',
  exact_addresses: 'exact addresses',
  names: 'names',
};

const pretty = (key: string) => CATEGORY_LABELS[key] ?? key.replace(/_/g, ' ');

/**
 * Consent and privacy controls.
 *
 * Every toggle here is off unless the user's own consent record says
 * otherwise; there is no client-side default that could start one checked.
 * Each option shows the full disclosure set — what is included, what is
 * excluded, who receives it, and what withdrawal does and does not undo —
 * rather than a bare switch.
 */
export function PrivacySettings() {
  const { data: consentData, reload: reloadConsents } = useApi<{ consents: ConsentOption[] }>('/consents');
  const { data: acceptanceData } = useApi<{ acceptances: Acceptance[] }>('/legal/acceptances');
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (option: ConsentOption) => {
    setBusy(option.kind); setError(null);
    try {
      if (option.granted) {
        await api.post('/consents/withdraw', { kind: option.kind });
        toast('Consent withdrawn.', 'success');
      } else {
        // `confirmed: true` is required by the API. It is sent only from this
        // explicit click handler, never as a default in component state.
        await api.post('/consents', { kind: option.kind, versionId: option.versionId, confirmed: true });
        toast('Consent recorded.', 'success');
      }
      reloadConsents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your preference.');
    } finally { setBusy(null); }
  };

  return (
    <>
      <Card>
        <div className="card-body">
          <h2>Your privacy choices</h2>
          <p className="muted">
            These are all optional. None of them is required to use SkillSplore, and turning any of
            them off will not restrict your account.
          </p>

          {error && <Alert type="error">{error}</Alert>}

          {(consentData?.consents ?? []).map((option) => (
            <div key={option.kind} className="card" style={{ marginBottom: 14 }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{KIND_LABELS[option.kind]}</h3>
                    {!option.available && (
                      <p className="muted" style={{ margin: '4px 0 0' }}>
                        Not currently available. This programme is disabled pending legal review.
                      </p>
                    )}
                  </div>
                  <Button
                    variant={option.granted ? 'outline' : 'primary'}
                    loading={busy === option.kind}
                    disabled={!option.available || !option.versionId}
                    onClick={() => toggle(option)}
                  >
                    {option.granted ? 'Withdraw' : 'Opt in'}
                  </Button>
                </div>

                {option.wording && <p style={{ marginTop: 10 }}>{option.wording}</p>}
                {option.purpose && <p className="muted"><strong>Purpose:</strong> {option.purpose}</p>}

                {option.dataCategories.length > 0 && (
                  <p className="muted">
                    <strong>Included:</strong> {option.dataCategories.map(pretty).join(', ')}.
                  </p>
                )}

                {option.excludedCategories.length > 0 && (
                  <p className="muted">
                    <strong>Never included:</strong> {option.excludedCategories.map(pretty).join(', ')}.
                  </p>
                )}

                {option.recipientCategories.length > 0 && (
                  <p className="muted">
                    <strong>Who receives it:</strong> {option.recipientCategories.join(', ')}.
                  </p>
                )}

                {option.retentionSummary && (
                  <p className="muted"><strong>Retention:</strong> {option.retentionSummary}</p>
                )}
                {option.withdrawalSummary && (
                  <p className="muted"><strong>Withdrawal:</strong> {option.withdrawalSummary}</p>
                )}

                {/* Stated plainly rather than buried. Withdrawal going forward
                    is not the same as undoing a disclosure already made. */}
                {option.granted && !option.priorDisclosuresReversible && (
                  <p className="muted">
                    <strong>Note:</strong> withdrawing stops future use. It cannot undo a disclosure
                    that has already happened.
                  </p>
                )}

                {option.granted && option.grantedAt && (
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    Opted in on {new Date(option.grantedAt).toLocaleDateString()}
                    {option.version && <> (version {option.version})</>}.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="card-body">
          <h2>Policies you have accepted</h2>
          {(acceptanceData?.acceptances ?? []).length === 0 ? (
            <p className="muted">No acceptance records yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Document</th><th>Version</th><th>Accepted</th><th>How</th></tr>
              </thead>
              <tbody>
                {(acceptanceData?.acceptances ?? []).map((a) => (
                  <tr key={`${a.slug}-${a.version}`}>
                    <td>{a.title}</td>
                    <td><code>{a.version}</code></td>
                    <td>{new Date(a.acceptedAt).toLocaleDateString()}</td>
                    <td className="muted">{a.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card>
        <div className="card-body">
          <h2>Your information</h2>
          <p className="muted">
            You can ask us for a copy of your information, ask us to correct it, or ask us to delete
            your account. Requests are recorded and tracked.
          </p>
          <Link to="/privacy-request" className="btn btn-outline">Make a privacy request</Link>
          <p className="muted" style={{ marginTop: 12, fontSize: '0.9rem' }}>
            Deletion may not immediately remove records we are legally required to keep, evidence
            relevant to a live dispute, or copies held in ordinary backup cycles until those expire.
            See the <Link to="/privacy">privacy policy</Link> for the full position.
          </p>
        </div>
      </Card>
    </>
  );
}
