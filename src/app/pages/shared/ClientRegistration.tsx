import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';

export default function ClientRegistration() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+49 ',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    newsletter: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const passwordStrength = (password: string) => {
    if (!password) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  const strength = passwordStrength(formData.password);
  const strengthColors = ['#C62828', '#BF6000', '#2E7D32'];
  const strengthLabels = ['Schwach', 'Mittel', 'Stark'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.email.includes('@')) {
      newErrors.email = 'Bitte gib eine gültige E-Mail-Adresse ein';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Die Passwörter stimmen nicht überein';
    }
    if (!formData.acceptTerms) {
      newErrors.terms = 'Bitte akzeptiere die AGB';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Navigate to client home on success
    navigate('/client/home');
  };

  return (
    <div className="min-h-screen p-6 pb-12">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <h1 className="font-heading text-3xl mb-2" style={{ color: '#8B4513' }}>
            Konto erstellen
          </h1>
          <div className="text-sm text-right" style={{ color: '#555555' }}>
            1 / 2
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              Vorname
            </label>
            <input
              type="text"
              placeholder="Vorname"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
              style={{ 
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8B4513'}
              onBlur={(e) => e.target.style.borderColor = '#EEEEEE'}
              required
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              Nachname
            </label>
            <input
              type="text"
              placeholder="Nachname"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              E-Mail
            </label>
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              className={`w-full h-12 px-4 rounded-xl border ${errors.email ? 'border-[#C62828]' : ''}`}
              style={{ 
                backgroundColor: '#F5F5F5', 
                borderColor: errors.email ? '#C62828' : '#EEEEEE'
              }}
              onFocus={(e) => !errors.email && (e.target.style.borderColor = '#8B4513')}
              onBlur={(e) => !errors.email && (e.target.style.borderColor = '#EEEEEE')}
              required
            />
            {errors.email && (
              <p className="text-sm mt-1" style={{ color: '#C62828' }}>{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              Telefon
            </label>
            <input
              type="tel"
              placeholder="Telefonnummer"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Passwort"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-12 px-4 pr-12 rounded-xl border bg-[#F5F5F5] border-[#EEEEEE]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#555555' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded"
                      style={{ 
                        backgroundColor: i < strength ? strengthColors[strength - 1] : '#EEEEEE' 
                      }}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <p className="text-xs mt-1" style={{ color: strengthColors[strength - 1] }}>
                    {strengthLabels[strength - 1]}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block mb-2 text-sm font-medium" style={{ color: '#555555' }}>
              Passwort bestätigen
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Passwort bestätigen"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                className={`w-full h-12 px-4 pr-12 rounded-xl border ${errors.confirmPassword ? 'border-[#C62828]' : ''}`}
                style={{ 
                  backgroundColor: '#F5F5F5', 
                  borderColor: errors.confirmPassword ? '#C62828' : '#EEEEEE'
                }}
                onFocus={(e) => !errors.confirmPassword && (e.target.style.borderColor = '#8B4513')}
                onBlur={(e) => !errors.confirmPassword && (e.target.style.borderColor = '#EEEEEE')}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#555555' }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm mt-1" style={{ color: '#C62828' }}>{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 w-5 h-5 rounded accent-[#E05A4E]"
            />
            <label htmlFor="terms" className="text-sm" style={{ color: '#555555' }}>
              Ich akzeptiere die{' '}
              <a href="#" className="text-[#1A8C85] hover:underline">AGB</a>
              {' '}und{' '}
              <a href="#" className="text-[#1A8C85] hover:underline">Datenschutzerklärung</a>
            </label>
          </div>

          {/* Newsletter Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="newsletter"
              checked={formData.newsletter}
              onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
              className="mt-1 w-5 h-5 rounded accent-[#E05A4E]"
            />
            <label htmlFor="newsletter" className="text-sm" style={{ color: '#555555' }}>
              Newsletter und Angebote erhalten (optional)
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-14 rounded-xl font-bold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all mt-6"
            style={{ backgroundColor: '#E05A4E' }}
          >
            Konto erstellen
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#EEEEEE]" />
            <span className="text-sm" style={{ color: '#555555' }}>Oder registrieren mit</span>
            <div className="flex-1 h-px bg-[#EEEEEE]" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="w-full h-14 rounded-xl font-medium bg-white border-2 flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all border-[#EEEEEE]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
              <path d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z" fill="#34A853"/>
              <path d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z" fill="#FBBC05"/>
              <path d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z" fill="#EA4335"/>
            </svg>
            Mit Google fortfahren
          </button>

          {/* Footer Link */}
          <div className="text-center mt-6">
            <Link to="/login" className="text-[#1A8C85] hover:underline">
              Bereits registriert? Anmelden
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}