import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export default function ProviderRegistrationStep1() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+49 ',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/provider/dashboard');
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-md mx-auto">
        <Link to="/provider/type-selection" className="inline-block mb-4">
          <ArrowLeft size={24} style={{ color: '#8B4513' }} />
        </Link>

        <div className="mb-6">
          <h1 className="font-heading text-3xl mb-2" style={{ color: '#8B4513' }}>
            Persönliche Angaben
          </h1>
          <div className="flex items-center justify-between">
            <p style={{ color: '#555555' }}>Schritt 1 / 5</p>
            <div className="flex-1 ml-4 h-2 rounded-full bg-[#F5F5F5]">
              <div className="h-full rounded-full" style={{ width: '20%', backgroundColor: '#8B4513' }} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Vorname"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />
          <input
            type="text"
            placeholder="Nachname"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />
          <input
            type="email"
            placeholder="E-Mail"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />
          <input
            type="tel"
            placeholder="Telefon"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />
          <input
            type="password"
            placeholder="Passwort bestätigen"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
            required
          />

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 w-5 h-5 rounded accent-[#E05A4E]"
              required
            />
            <label htmlFor="terms" className="text-sm" style={{ color: '#555555' }}>
              Ich akzeptiere die{' '}
              <a href="#" className="text-[#1A8C85]">AGB für Anbieter</a>
              {' '}und{' '}
              <a href="#" className="text-[#1A8C85]">Datenschutzerklärung</a>
            </label>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-xl font-bold text-white mt-6"
            style={{ backgroundColor: '#E05A4E' }}
          >
            Weiter zu Schritt 2
          </button>
        </form>
      </div>
    </div>
  );
}