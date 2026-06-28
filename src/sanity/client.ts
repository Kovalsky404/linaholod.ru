import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Sanity-клиент для чтения контента.
 *
 * useCdn: false — кэшированием управляет Next ISR (revalidate 60с), а свежий
 * API даёт актуальные данные сразу после правок (CDN мог бы залипать). Токен в
 * публичный клиент не передаём (читаем опубликованные данные).
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
});
