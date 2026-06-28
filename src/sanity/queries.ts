import { groq } from "next-sanity";

/**
 * GROQ-запросы. Изображения отдаём как raw-объекты (asset ref + hotspot/crop) —
 * URL строим на месте через urlFor. Сортировка коллекций — по полю order.
 */

/** Singleton настроек сайта. */
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0]{
    telegram, instagram, whatsapp, phone, email,
    heroImage,
    aboutTitle, aboutText,
    whyMeTitle, whyMeText, whyMeImage,
    servicesTerms,
    bookingIntro
  }
`;

/** Услуги по порядку. */
export const servicesQuery = groq`
  *[_type == "service"] | order(order asc, _createdAt asc){
    _id, title, price, description, image, order
  }
`;

/** Работы портфолио по порядку. */
export const portfolioQuery = groq`
  *[_type == "portfolioItem"] | order(order asc, _createdAt asc){
    _id, number, title, shoot, description, date, coverImage, gallery, order
  }
`;

/** Отзывы по порядку. */
export const reviewsQuery = groq`
  *[_type == "review"] | order(order asc, _createdAt asc){
    _id, author, text, rating, order
  }
`;
