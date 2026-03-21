import { motion } from "motion/react";
import { MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import { contactInfo } from "../../config/data";

export function ContactSection() {
  return (
    <section id="contact" className="py-24 bg-brand-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-16"
        >
          {/* Contact Details */}
          <div>
            <h2 className="font-display font-bold text-4xl text-brand-charcoal mb-4">Kontakt & Anfahrt</h2>
            <p className="font-serif italic text-xl text-brand-charcoal/70 mb-10">
              Kommen Sie vorbei oder rufen Sie an.
            </p>

            <div className="space-y-8 font-sans">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0">
                  <MapPin className="text-brand-red w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-charcoal text-lg mb-1">Adresse</h3>
                  <p className="text-brand-charcoal/80">Barmer Pizzeria</p>
                  <p className="text-brand-charcoal/80">{contactInfo.address}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                  <Phone className="text-brand-gold w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-charcoal text-lg mb-1">Telefon</h3>
                  <a 
                    href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} 
                    className="text-brand-charcoal hover:text-brand-red text-xl font-medium transition-colors inline-block"
                  >
                    {contactInfo.phone}
                  </a>
                  <p className="text-brand-charcoal/60 text-sm mt-1">
                    Keine E-Mail / kein Buchungssystem — rufen Sie uns einfach an!
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-charcoal/10 flex items-center justify-center shrink-0">
                  <Clock className="text-brand-charcoal w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-charcoal text-lg mb-1">Lieferung</h3>
                  <p className="text-brand-charcoal/80">Ab 17:00 Uhr im Barmen-Gebiet.</p>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <a
                href={`https://wa.me/${contactInfo.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded font-sans font-semibold hover:bg-[#1DA851] transition-colors shadow-sm w-full sm:w-auto"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp Bestellung
              </a>
            </div>
          </div>

          {/* Map */}
          <div className="h-[400px] lg:h-auto rounded-lg overflow-hidden shadow-sm border border-gray-200 group">
            <iframe 
              src={contactInfo.googleMapsIframe} 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale group-hover:grayscale-0 transition-all duration-700"
              title="Barmer Pizzeria Map"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
