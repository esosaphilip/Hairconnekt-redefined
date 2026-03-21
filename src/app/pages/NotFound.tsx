import { Link } from 'react-router';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
      <div className="mb-8">
        <div className="text-9xl font-heading text-[#8B4513]">404</div>
        <h1 className="font-heading text-3xl mt-4 mb-2 text-[#8B4513]">
          Seite nicht gefunden
        </h1>
        <p className="text-[#6B6B6B]">
          Die gesuchte Seite existiert leider nicht.
        </p>
      </div>

      <Link
        to="/client/home"
        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-[#E05A4E]"
        style={{ boxShadow: '0 4px 16px rgba(224,90,78,0.25)' }}
      >
        <Home size={20} />
        Zur Startseite
      </Link>
    </div>
  );
}