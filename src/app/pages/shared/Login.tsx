import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple demo navigation
    navigate('/client/home');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-[#C8860A] flex items-center justify-center bg-white shadow-md mx-auto mb-4">
            <span className="font-heading text-2xl text-[#8B4513]">HC</span>
          </div>
          <h1 className="font-heading text-3xl text-[#8B4513]">
            Willkommen zurück!
          </h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-[#C62828]">
            <p className="text-sm text-[#C62828]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-[#6B6B6B]">
              E-Mail / Telefon
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-0 bg-[#F5F5F5] focus:ring-2 focus:ring-[#8B4513] outline-none"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-[#6B6B6B]">
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 rounded-xl border-0 bg-[#F5F5F5] focus:ring-2 focus:ring-[#8B4513] outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link to="/password-reset" className="text-sm text-[#1A8C85] hover:underline">
                Passwort vergessen?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-xl font-bold text-white active:scale-[0.98] transition-all bg-[#E05A4E]"
            style={{ boxShadow: '0 4px 16px rgba(224,90,78,0.25)' }}
          >
            Anmelden
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#EEEEEE]" />
            <span className="text-sm text-[#6B6B6B]">Oder</span>
            <div className="flex-1 h-px bg-[#EEEEEE]" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="w-full h-14 rounded-xl font-medium bg-white border border-[#EEEEEE] flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
              <path d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" fill="#34A853"/>
              <path d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z" fill="#FBBC05"/>
              <path d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z" fill="#EA4335"/>
            </svg>
            Mit Google fortfahren
          </button>

          {/* Footer */}
          <div className="text-center mt-6">
            <Link to="/account-type" className="text-[#1A8C85] hover:underline">
              Noch kein Konto? Jetzt registrieren
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}