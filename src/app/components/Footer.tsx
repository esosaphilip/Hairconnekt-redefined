import { Link } from "react-router";
import { contactInfo, openingHours } from "../../config/data";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-charcoal text-white/80 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-display font-bold text-xl tracking-wider text-white mb-4 uppercase">
              Barmer Pizzeria
            </h3>
            <p className="font-sans text-sm leading-relaxed mb-6">
              Hausgemacht. Frisch. Seit Jahren in Barmen. Ihr lokaler Imbiss für Pizza, Grill, Döner und Pasta.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-serif italic text-white text-lg mb-4">Links</h4>
            <ul className="space-y-3 font-sans text-sm">
              <li><a href="/#menu" className="hover:text-white transition-colors">Speisekarte</a></li>
              <li><a href="/#delivery" className="hover:text-white transition-colors">Lieferung</a></li>
              <li><a href="/#about" className="hover:text-white transition-colors">Über Uns</a></li>
              <li><a href="/#hours" className="hover:text-white transition-colors">Öffnungszeiten</a></li>
            </ul>
          </div>

          {/* Öffnungszeiten */}
          <div>
            <h4 className="font-serif italic text-white text-lg mb-4">Öffnungszeiten</h4>
            <ul className="space-y-2 font-sans text-sm">
              {openingHours.map((oh) => (
                <li key={oh.day} className="flex justify-between">
                  <span>{oh.day}</span>
                  <span className={oh.closed ? "text-red-400 font-medium" : ""}>{oh.hours}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="font-serif italic text-white text-lg mb-4">Kontakt</h4>
            <address className="not-italic font-sans text-sm space-y-3">
              <p>{contactInfo.address.split(',')[0]}<br/>{contactInfo.address.split(', ')[1]}</p>
              <p>
                <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="text-white hover:text-brand-red transition-colors font-medium">
                  {contactInfo.phone}
                </a>
              </p>
              <p className="text-xs text-white/60">Nur telefonische Bestellungen.</p>
            </address>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-sans text-sm">
            &copy; {currentYear} Barmer Pizzeria. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6 font-sans text-sm">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
