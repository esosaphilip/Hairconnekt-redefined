import { motion } from "motion/react";

export function Impressum() {
  return (
    <div className="pt-32 pb-24 bg-brand-cream min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-white p-8 md:p-12 rounded-lg shadow-sm border border-gray-100"
        >
          <h1 className="font-display font-bold text-4xl text-brand-charcoal mb-8 border-b border-gray-100 pb-4">
            Impressum
          </h1>
          
          <div className="space-y-6 font-sans text-brand-charcoal/80">
            <section>
              <h2 className="font-bold text-lg text-brand-charcoal mb-2">Angaben gemäß § 5 TMG</h2>
              <p>
                Barmer Pizzeria<br />
                Heubruch 17<br />
                42275 Wuppertal-Barmen
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg text-brand-charcoal mb-2">Vertreten durch</h2>
              <p>Honarmand [Vorname noch ergänzen]</p>
            </section>

            <section>
              <h2 className="font-bold text-lg text-brand-charcoal mb-2">Kontakt</h2>
              <p>
                Telefon: 0202 553869<br />
                E-Mail: kontakt@barmer-pizzeria-wuppertal.de [Platzhalter]
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg text-brand-charcoal mb-2">Umsatzsteuer-ID</h2>
              <p>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                DE [Nummer noch ergänzen]
              </p>
            </section>

            <section>
              <h2 className="font-bold text-lg text-brand-charcoal mb-2">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
              <p>
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
