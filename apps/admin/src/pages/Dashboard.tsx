import { useCallback, useEffect, useId, useState } from 'react';
import { AlertCircle, CheckCircle, Sparkles, Users } from 'lucide-react';
import { getAdminStats, type AdminStatsResponse } from '../api';
import { LoadingSpinner, PageError, useToasts } from '../components/ui';
import { formatApiError } from '../utils/apiError';

interface CardData {
  label: string;
  value: number;
  background: string;
  color: string;
  icon: React.ComponentType<{ size?: number }>;
}

export default function Dashboard() {
  const toast = useToasts();
  const cardsBaseId = useId();
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);

  const loadStats = useCallback(async () => {
    setPageError('');
    try {
      setIsLoading(true);
      const adminStats = await getAdminStats();
      setStats(adminStats);
    } catch (err: unknown) {
      const detail = formatApiError(err);
      const message = `Fehler beim Laden der Statistiken. ${detail}`;
      setPageError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const cards: CardData[] = stats
    ? [
        {
          label: 'Ausstehende Anbieter',
          value: stats.pendingProviders || 0,
          background: '#fef3c7',
          color: '#b45309',
          icon: AlertCircle,
        },
        {
          label: 'Genehmigte Anbieter',
          value: stats.approvedProviders || 0,
          background: '#dcfce7',
          color: '#15803d',
          icon: CheckCircle,
        },
        {
          label: 'Kategorien Aktiv',
          value: stats.activeCategories || 0,
          background: '#e0e7ff',
          color: 'var(--primary)',
          icon: Users,
        },
        {
          label: 'Beliebte Styles Aktiv',
          value: stats.activePopularStyles || 0,
          background: '#fef3c7',
          color: '#b45309',
          icon: Sparkles,
        },
      ]
    : [];

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Dashboard Overview</h1>

      {pageError && <PageError message={pageError} onRetry={() => void loadStats()} />}

      {isLoading && !stats && <LoadingSpinner label="Statistiken werden geladen…" />}

      {!isLoading && stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
          role="group"
          aria-label="Dashboard Übersicht"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            const safeLabel = card.label.replace(/\s+/g, '-').toLowerCase();
            const labelId = `${cardsBaseId}-${safeLabel}`;
            return (
              <section
                key={card.label}
                className="card"
                aria-labelledby={labelId}
                style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    background: card.background,
                    padding: '1rem',
                    borderRadius: '16px',
                    color: card.color,
                  }}
                >
                  <Icon size={32} />
                </div>
                <div>
                  <p
                    id={labelId}
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      margin: 0,
                    }}
                  >
                    {card.label}
                  </p>
                  <div
                    aria-live="polite"
                    aria-atomic="true"
                    style={{ display: 'inline-block' }}
                  >
                    <h2
                      style={{
                        fontSize: '2rem',
                        margin: '0.25rem 0 0',
                        lineHeight: 1,
                      }}
                    >
                      {card.value}
                    </h2>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
