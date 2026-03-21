import { useState } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';

export default function PasswordReset() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {step === 1 && (
          <div>
            <h1 className="font-heading text-3xl mb-2" style={{ color: '#8B4513' }}>
              Passwort zurücksetzen
            </h1>
            <p className="mb-6" style={{ color: '#555555' }}>
              Gib deine E-Mail-Adresse ein, um einen Code zu erhalten
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="E-Mail-Adresse"
                className="w-full h-12 px-4 rounded-xl border mb-4 bg-[#F5F5F5] border-[#EEEEEE]"
                required
              />
              <button
                type="submit"
                className="w-full h-14 rounded-xl font-bold text-white"
                style={{ backgroundColor: '#E05A4E' }}
              >
                Code senden
              </button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ backgroundColor: '#E8F5E9' }}>
              <Check size={40} style={{ color: '#2E7D32' }} />
            </div>
            <h1 className="font-heading text-3xl mb-2" style={{ color: '#8B4513' }}>
              Passwort erfolgreich geändert!
            </h1>
            <Link
              to="/login"
              className="inline-block mt-6 px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#E05A4E' }}
            >
              Zur Anmeldung
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}