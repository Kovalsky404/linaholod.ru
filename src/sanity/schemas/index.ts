import type { SchemaTypeDefinition } from "sanity";
import { siteSettings } from "./siteSettings";
import { service } from "./service";
import { portfolioItem } from "./portfolioItem";
import { review } from "./review";

/** Все типы контента для Studio. */
export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  service,
  portfolioItem,
  review,
];
