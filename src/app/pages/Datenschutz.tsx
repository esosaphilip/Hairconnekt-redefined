import { motion } from "motion/react";

export function Datenschutz() {
  return (
    <div className="pt-32 pb-24 bg-brand-cream min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-white p-8 md:p-12 rounded-lg shadow-sm border border-gray-100"
        >
          <h1 className="font-display font-bold text-4xl text-brand-charcoal mb-8 border-b border-gray-100 pb-4">
            Datenschutzerklärung
          </h1>
          
          <div className="space-y-8 font-sans text-brand-charcoal/80">
            <section>
              <h2 className="font-bold text-xl text-brand-charcoal mb-3">1. Datenschutz auf einen Blick</h2>
              <h3 className="font-semibold text-brand-charcoal mb-2">Allgemeine Hinweise</h3>
              <p className="mb-4">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-xl text-brand-charcoal mb-3">2. Allgemeine Hinweise und Pflichtinformationen</h2>
              <h3 className="font-semibold text-brand-charcoal mb-2">Datenschutz</h3>
              <p className="mb-4">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
              </p>
              
              <h3 className="font-semibold text-brand-charcoal mb-2">Hinweis zur verantwortlichen Stelle</h3>
              <p className="mb-4">
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
                Barmer Pizzeria<br />
                Heubruch 17<br />
                42275 Wuppertal-Barmen<br /><br />
                Telefon: 0202 553869<br />
              </p>
            </section>

            <section>
              <h2 className="font-bold text-xl text-brand-charcoal mb-3">3. Datenerfassung auf dieser Website</h2>
              <h3 className="font-semibold text-brand-charcoal mb-2">Server-Log-Dateien</h3>
              <p className="mb-4">
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Browsertyp und Browserversion</li>
                <li>verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p>
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-xl text-brand-charcoal mb-3">4. Plugins und Tools</h2>
              <h3 className="font-semibold text-brand-charcoal mb-2">Google Maps</h3>
              <p className="mb-4">
                Diese Seite nutzt über eine API den Kartendienst Google Maps. Anbieter ist die Google Ireland Limited ("Google"), Gordon House, Barrow Street, Dublin 4, Irland.
              </p>
              <p>
                Zur Nutzung der Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse zu speichern. Diese Informationen werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert. Der Anbieter dieser Seite hat keinen Einfluss auf diese Datenübertragung.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
