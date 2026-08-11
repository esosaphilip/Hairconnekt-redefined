import { useCallback, useEffect, useId, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import api from '../api';
import { formatApiError } from '../utils/apiError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteInfo = {
  email: string;
  role: string;
};

function mapVerifyError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) {
      return 'Einladung nicht gefunden.';
    }
    if (status === 410) {
      return 'Einladung ist abgelaufen oder wurde widerrufen.';
    }
    if (status === 409) {
      return 'Einladung wurde bereits angenommen.';
    }
    const detail = formatApiError(err);
    if (detail && !detail.includes('Unbekannter Fehler')) {
      return detail;
    }
  }
  return 'Einladung ungültig oder nicht mehr gültig.';
}

function mapAcceptError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) {
      return 'Einladung nicht gefunden.';
    }
    if (status === 410) {
      return 'Einladung ist abgelaufen oder wurde widerrufen.';
    }
    if (status === 409) {
      return 'Einladung wurde bereits angenommen.';
    }
    if (status === 400) {
      const detail = formatApiError(err);
      if (detail) {
        const lowered = detail.toLowerCase();
        if (lowered.includes('passwort') || lowered.includes('password')) {
          return detail;
        }
        return `Ungültige Anfrage. ${detail}`;
      }
      return 'Ungültige Anfrage. Bitte prüfen Sie Ihre Eingaben.';
    }
    const detail = formatApiError(err);
    if (detail && !detail.includes('Unbekannter Fehler')) {
      return detail;
    }
  }
  return 'Konto konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.';
}

export default function AcceptInvite() {
  const pwErrorId = useId();
  const pwConfirmErrorId = useId();
  const globalErrorId = useId();

  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [verifyError, setVerifyError] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [acceptError, setAcceptError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    setToken(tokenParam);
  }, []);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setIsVerifying(false);
      setIsVerified(false);
      setVerifyError('Kein Einladungs-Token in der URL gefunden.');
      return;
    }
    try {
      setIsVerifying(true);
      setVerifyError('');
      const res = await api.get(`/invitations/${encodeURIComponent(token)}/verify`);
      const data = res?.data;
      const email = String(data?.email ?? '');
      const role = String(data?.role ?? 'admin');
      if (!EMAIL_REGEX.test(email)) {
        setVerifyError('Einladung enthält keine gültige E-Mail-Adresse.');
        setIsVerifying(false);
        return;
      }
      setInviteInfo({ email, role });
      setIsVerified(true);
    } catch (err: unknown) {
      setIsVerified(false);
      setVerifyError(mapVerifyError(err));
    } finally {
      setIsVerifying(false);
    }
  }, [token]);

  useEffect(() => {
    if (token === null) return;
    void verifyToken();
  }, [token, verifyToken]);

  const validate = (): boolean => {
    let ok = true;

    setPasswordError('');
    setPasswordConfirmError('');

    if (!password) {
      setPasswordError('Passwort ist erforderlich.');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.');
      ok = false;
    }

    if (!passwordConfirm) {
      setPasswordConfirmError('Bitte bestätigen Sie Ihr Passwort.');
      ok = false;
    } else if (passwordConfirm !== password) {
      setPasswordConfirmError('Passwörter stimmen nicht überein.');
      ok = false;
    }

    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcceptError('');
    if (!validate()) return;
    if (isSubmitting || !token || success) return;

    try {
      setIsSubmitting(true);
      await api.post(`/invitations/${encodeURIComponent(token)}/accept`, { password });
      setSuccess(true);
      window.setTimeout(() => {
        window.location.href = '/login?success=invite-accepted';
      }, 1200);
    } catch (err: unknown) {
      setAcceptError(mapAcceptError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = inviteInfo?.role?.toLowerCase() === 'admin' ? 'Admin' : (inviteInfo?.role || 'Benutzer');

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>HairConnekt</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Einladung akzeptieren</p>

        {isVerifying ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              color: 'var(--text-muted)',
              gap: '0.75rem',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'hc-spin 0.9s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.875rem' }}>Einladung wird geprüft…</span>
            <style>{`@keyframes hc-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !token ? (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
            }}
          >
            <ShieldAlert size={44} style={{ opacity: 0.3, margin: '0 auto 1rem', color: 'var(--danger)' }} />
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Fehlender Einladungslink
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Der Einladungslink ist unvollständig. Bitte öffnen Sie den vollständigen Link aus der E-Mail.
            </div>
            <a
              href="/login"
              className="btn btn-outline"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Zum Login
            </a>
          </div>
        ) : !isVerified || !inviteInfo ? (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              textAlign: 'center',
              padding: '0.5rem 0 1rem 0',
            }}
          >
            <ShieldAlert size={44} style={{ opacity: 0.3, margin: '0 auto 1rem', color: 'var(--danger)' }} />
            <div
              id={globalErrorId}
              role="alert"
              style={{
                color: 'var(--danger)',
                padding: '0.75rem',
                background: '#fee2e2',
                borderRadius: '8px',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {verifyError || 'Einladung ungültig oder nicht mehr gültig.'}
            </div>
            <a
              href="/login"
              className="btn btn-outline"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Zum Login
            </a>
          </div>
        ) : (
          <>
            <div
              style={{
                textAlign: 'center',
                padding: '0.5rem 0 1.25rem 0',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1.25rem',
              }}
            >
              <ShieldCheck size={40} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                Du wurdest eingeladen als{' '}
                <span style={{ color: 'var(--primary)' }}>{roleLabel}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {inviteInfo.email}
              </div>
            </div>

            {success ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  color: '#166534',
                  padding: '0.875rem',
                  background: '#dcfce7',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                }}
              >
                Konto erfolgreich erstellt! Du wirst zum Login weitergeleitet…
              </div>
            ) : (
              <>
                {acceptError && (
                  <div
                    id={globalErrorId}
                    role="alert"
                    aria-live="assertive"
                    style={{
                      color: 'var(--danger)',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: '#fee2e2',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  >
                    {acceptError}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  noValidate
                >
                  <div>
                    <label
                      htmlFor="hc-accept-password"
                      style={{
                        display: 'block',
                        marginBottom: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'left',
                      }}
                    >
                      Passwort
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="hc-accept-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="new-password"
                        minLength={8}
                        className="input-field"
                        placeholder="Neues Passwort"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                          if (passwordConfirmError && e.target.value === passwordConfirm) {
                            setPasswordConfirmError('');
                          }
                        }}
                        aria-invalid={Boolean(passwordError) || undefined}
                        aria-describedby={passwordError ? pwErrorId : undefined}
                        disabled={isSubmitting}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isSubmitting}
                        aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                        aria-pressed={showPassword}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordError && (
                      <div
                        id={pwErrorId}
                        style={{
                          marginTop: '0.375rem',
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                          textAlign: 'left',
                        }}
                      >
                        {passwordError}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="hc-accept-password-confirm"
                      style={{
                        display: 'block',
                        marginBottom: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'left',
                      }}
                    >
                      Passwort bestätigen
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="hc-accept-password-confirm"
                        type={showPasswordConfirm ? 'text' : 'password'}
                        name="password-confirm"
                        autoComplete="new-password"
                        minLength={8}
                        className="input-field"
                        placeholder="Passwort wiederholen"
                        value={passwordConfirm}
                        onChange={(e) => {
                          setPasswordConfirm(e.target.value);
                          if (passwordConfirmError) setPasswordConfirmError('');
                          if (passwordError && e.target.value === password && password.length >= 8) {
                            setPasswordError('');
                          }
                        }}
                        aria-invalid={Boolean(passwordConfirmError) || undefined}
                        aria-describedby={passwordConfirmError ? pwConfirmErrorId : undefined}
                        disabled={isSubmitting}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm((prev) => !prev)}
                        disabled={isSubmitting}
                        aria-label={showPasswordConfirm ? 'Passwort verbergen' : 'Passwort anzeigen'}
                        aria-pressed={showPasswordConfirm}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordConfirmError && (
                      <div
                        id={pwConfirmErrorId}
                        style={{
                          marginTop: '0.375rem',
                          color: 'var(--danger)',
                          fontSize: '0.75rem',
                          textAlign: 'left',
                        }}
                      >
                        {passwordConfirmError}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting || undefined}
                  >
                    {isSubmitting ? 'Wird erstellt…' : 'Konto erstellen'}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}