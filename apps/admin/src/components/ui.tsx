/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Loading skeleton — re-uses the spinner pattern from PopularStyles.tsx.
// ---------------------------------------------------------------------------

export function LoadingSpinner({ label = 'Lädt...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
        color: 'var(--text-muted)',
        gap: '0.75rem',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'hc-spin 0.9s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.875rem' }}>{label}</span>
      <style>{`@keyframes hc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page error banner with role=alert.
// ---------------------------------------------------------------------------

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        marginTop: '1rem',
        padding: '0.875rem 1rem',
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{message}</div>
      {onRetry && (
        <button type="button" className="btn btn-outline" style={{ flexShrink: 0 }} onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm/Alert/Prompt Modal (replaces window.alert/confirm/prompt).
//
//   <ConfirmDialog
//     open={...}
//     onClose={() => setOpen(false)}
//     title="Benutzer löschen?"
//     description="Diese Aktion kann nicht rückgängig gemacht werden."
//     confirmLabel="Löschen"
//     confirmVariant="danger"
//     onConfirm={() => { ... }}
//   />
//
//   <PromptDialog
//     open={...}
//     onClose={() => setOpen(false)}
//     title="Grund für Ablehnung"
//     description="Wird im Audit-Trail gespeichert."
//     confirmLabel="Senden"
//     placeholder="Bitte kurz begründen (optional)."
//     multiline
//     onConfirm={(value) => { ... }}
//   />
// ---------------------------------------------------------------------------

type ConfirmVariant = 'primary' | 'success' | 'danger';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  confirmVariant = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  const [running, setRunning] = useState(false);
  if (!open) return null;

  const variantClass =
    confirmVariant === 'success'
      ? 'btn-success'
      : confirmVariant === 'primary'
        ? 'btn-primary'
        : 'btn-danger';

  const handleConfirm = async () => {
    if (running) return;
    try {
      setRunning(true);
      await onConfirm();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hc-confirm-title"
    >
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span id="hc-confirm-title" style={{ fontWeight: 600 }}>{title}</span>
          <button
            type="button"
            aria-label="Dialog schließen"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {description ?? null}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={running}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${variantClass}`}
            onClick={handleConfirm}
            disabled={running}
            aria-busy={running || undefined}
          >
            {running ? 'Wird ausgeführt…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
}

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'OK',
}: AlertDialogProps) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="hc-alert-title"
    >
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span id="hc-alert-title" style={{ fontWeight: 600 }}>{title}</span>
          <button
            type="button"
            aria-label="Dialog schließen"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {description ?? null}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  multiline?: boolean;
  initialValue?: string;
  required?: boolean;
  confirmVariant?: ConfirmVariant;
  onConfirm: (value: string) => void | Promise<void>;
}

export function PromptDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Abbrechen',
  placeholder,
  multiline = false,
  initialValue = '',
  required = false,
  confirmVariant = 'primary',
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState('');
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (open && value === initialValue && !running) {
    // no-op: we only reset via onOpenEffect below
  }

  // Reset value + focus when the dialog opens.
  useOpenEffect(open, () => {
    setValue(initialValue);
    setValidationError('');
    setRunning(false);
    setTimeout(() => {
      const el = multiline ? textareaRef.current : inputRef.current;
      el?.focus();
    }, 50);
  });

  if (!open) return null;

  const variantClass =
    confirmVariant === 'success'
      ? 'btn-success'
      : confirmVariant === 'primary'
        ? 'btn-primary'
        : 'btn-danger';

  const handleConfirm = async () => {
    if (running) return;
    if (required && !value.trim()) {
      setValidationError('Eine Eingabe ist erforderlich.');
      return;
    }
    try {
      setRunning(true);
      await onConfirm(value);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hc-prompt-title"
    >
      <div
        className="modal"
        style={{ maxWidth: multiline ? 520 : 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span id="hc-prompt-title" style={{ fontWeight: 600 }}>{title}</span>
          <button
            type="button"
            aria-label="Dialog schließen"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {description ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{description}</div>
          ) : null}
          {multiline ? (
            <textarea
              ref={textareaRef}
              className="input-field"
              rows={4}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder={placeholder}
              aria-invalid={Boolean(validationError) || undefined}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !running) {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
              aria-invalid={Boolean(validationError) || undefined}
            />
          )}
          {validationError && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
              {validationError}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={running}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${variantClass}`}
            onClick={handleConfirm}
            disabled={running}
            aria-busy={running || undefined}
          >
            {running ? 'Wird ausgeführt…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tiny helper: runs effect only when `open` transitions to true.
function useOpenEffect(open: boolean, cb: () => void) {
  const prev = useRef(open);
  useEffect(() => {
    if (!prev.current && open) cb();
    prev.current = open;
  }, [open, cb]);
}

// ---------------------------------------------------------------------------
// Toast system (replaces `alert(...)` for success feedback).
//
// Usage:
//   const toast = useToasts();
//   toast.success('Erfolgreich gespeichert.');
//   toast.error(`Speichern fehlgeschlagen. ${formatApiError(err)}`);
// ---------------------------------------------------------------------------

type ToastKind = 'success' | 'error';
interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 360,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const background = t.kind === 'success' ? '#dcfce7' : '#fef2f2';
          const border = t.kind === 'success' ? '#bbf7d0' : '#fecaca';
          const color = t.kind === 'success' ? '#166534' : '#991b1b';
          return (
            <div
              key={t.id}
              role="status"
              style={{
                background,
                border: `1px solid ${border}`,
                color,
                padding: '0.75rem 1rem',
                borderRadius: 10,
                boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
                fontSize: '0.875rem',
                lineHeight: 1.4,
                pointerEvents: 'auto',
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback for pages not yet wrapped: silent no-op.
    return { success() {}, error() {} };
  }
  return ctx;
}


