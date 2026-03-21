import { Hero } from "../components/Hero";
import { MenuSection } from "../components/MenuSection";
import { DeliverySection } from "../components/DeliverySection";
import { AboutSection } from "../components/AboutSection";
import { HoursSection } from "../components/HoursSection";
import { ContactSection } from "../components/ContactSection";

export function Home() {
  return (
    <>
      <Hero />
      <MenuSection />
      <DeliverySection />
      <AboutSection />
      <HoursSection />
      <ContactSection />
    </>
  );
}
