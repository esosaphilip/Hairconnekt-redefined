import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, Pizza } from "lucide-react";
import { clsx } from "clsx";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Speisekarte", href: "/#menu" },
    { name: "Lieferung", href: "/#delivery" },
    { name: "Über Uns", href: "/#about" },
    { name: "Öffnungszeiten", href: "/#hours" },
    { name: "Kontakt", href: "/#contact" }
  ];

  const bgStyle = scrolled || !isHome || mobileMenuOpen
    ? "bg-brand-white shadow-md text-brand-charcoal"
    : "bg-transparent text-brand-white";

  return (
    <nav className={clsx("fixed top-0 left-0 right-0 z-50 transition-all duration-300", bgStyle)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <Pizza className={clsx("w-6 h-6", (scrolled || !isHome || mobileMenuOpen) ? "text-brand-red" : "text-brand-white")} />
            <span className="font-display font-bold text-xl tracking-wider uppercase">
              Barmer Pizzeria
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="font-sans font-medium text-sm hover:text-brand-red transition-colors"
              >
                {link.name}
              </a>
            ))}
            <a
              href="/#contact"
              className="px-6 py-2.5 bg-brand-red text-brand-white font-sans font-semibold rounded shadow-sm hover:bg-red-800 transition-colors"
            >
              Jetzt Bestellen
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="focus:outline-none p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-white border-t border-gray-100">
          <div className="px-4 pt-2 pb-6 space-y-2 flex flex-col">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-3 text-brand-charcoal font-sans font-medium hover:text-brand-red border-b border-gray-50"
              >
                {link.name}
              </a>
            ))}
            <a
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center mt-4 px-6 py-3 bg-brand-red text-brand-white font-sans font-semibold rounded shadow-sm"
            >
              Jetzt Bestellen
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
