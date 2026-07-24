import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Portfolio } from "@/components/sections/Portfolio";
import { Services } from "@/components/sections/Services";
import { WhyMe } from "@/components/sections/WhyMe";
import { Reviews } from "@/components/sections/Reviews";
import { Booking } from "@/components/sections/Booking";
import {
  getPortfolio,
  getReviews,
  getServices,
  getSiteSettings,
} from "@/sanity/content";

/** ISR (сек): правки в Studio появляются без передеплоя. Должен быть литералом. */
export const revalidate = 60;

/**
 * Главная страница. Данные тянутся из Sanity (с фолбэком на src/lib).
 * Порядок: Hero → Обо мне → Портфолио → Услуги → Почему я? → Отзывы → Записаться.
 */
export default async function Home() {
  const [services, portfolio, reviews, settings] = await Promise.all([
    getServices(),
    getPortfolio(),
    getReviews(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Hero image={settings?.heroImage} />
      <About content={{ text: settings?.aboutText }} />
      <Portfolio items={portfolio} />
      <Services services={services} terms={settings?.servicesTerms} />
      <WhyMe
        content={{
          title: settings?.whyMeTitle,
          text: settings?.whyMeText,
          image: settings?.whyMeImage,
        }}
      />
      <Reviews reviews={reviews} />
      <Booking intro={settings?.bookingIntro} />
    </>
  );
}
