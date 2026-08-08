import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { adminLogin } from '../api';
import { formatApiError } from '../utils/apiError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const globalErrorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validate = (): boolean => {
    let ok = true;

    if (!email.trim()) {
      setEmailError('Email ist erforderlich.');
      ok = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      ok = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Passwort ist erforderlich.');
      ok = false;
    } else if (password.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.');
      ok = false;
    } else {
      setPasswordError('');
    }

    return ok;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await adminLogin(email.trim(), password);
      if (res?.user) {
        navigate('/dashboard');
      } else {
        setError('Anmeldung fehlgeschlagen.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError('Falsches Passwort oder falsche E-Mail!');
        } else if (status === 429 || status === 423) {
          setError(
            'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie 15 Minuten oder setzen Sie Ihr Passwort zurück.',
          );
        } else if (status === 403) {
          setError('Zugriff verweigert. Dieses Konto ist gesperrt oder hat keine Admin-Rechte.');
        } else if (err.message === 'Network Error') {
          setError(
            'Verbindung fehlgeschlagen. Backend ist möglicherweise nicht erreichbar oder blockiert CORS.',
          );
        } else {
          const detail = formatApiError(err);
          setError(`Anmeldung fehlgeschlagen. ${detail}`);
        }
      } else if (err instanceof Error) {
        setError(`Anmeldung fehlgeschlagen. ${err.message}`);
      } else {
        setError('Ungültige Anmeldedaten.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailInputId = 'admin-login-email';
  const passwordInputId = 'admin-login-password';

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>HairConnekt</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Admin Panel Login</p>

        {error && (
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
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          noValidate
        >
          <div>
            <label
              htmlFor={emailInputId}
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'left',
              }}
            >
              E-Mail-Adresse
            </label>
            <input
              id={emailInputId}
              type="email"
              name="email"
              autoComplete="email"
              className="input-field"
              placeholder="Email-Adresse"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              aria-invalid={Boolean(emailError) || undefined}
              aria-describedby={emailError ? emailErrorId : undefined}
              disabled={isSubmitting}
              required
            />
            {emailError && (
              <div
                id={emailErrorId}
                style={{
                  marginTop: '0.375rem',
                  color: 'var(--danger)',
                  fontSize: '0.75rem',
                  textAlign: 'left',
                }}
              >
                {emailError}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor={passwordInputId}
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
                id={passwordInputId}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                minLength={8}
                className="input-field"
                placeholder="Passwort"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                aria-invalid={Boolean(passwordError) || undefined}
                aria-describedby={passwordError ? passwordErrorId : undefined}
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
                id={passwordErrorId}
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
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting ? 'Anmeldung läuft…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
