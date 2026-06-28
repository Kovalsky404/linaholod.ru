"use client";

/**
 * Конфигурация встроенной Sanity Studio.
 * Studio открывается на /studio (basePath). Плагины: structureTool (контент),
 * visionTool (GROQ-песочница). siteSettings — singleton (один документ).
 */
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemas";

export default defineConfig({
  name: "default",
  title: "lina H. — контент",
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Контент")
          .items([
            // Singleton: Настройки сайта
            S.listItem()
              .title("Настройки сайта")
              .id("siteSettings")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings"),
              ),
            S.divider(),
            // Коллекции
            S.documentTypeListItem("service").title("Услуги"),
            S.documentTypeListItem("portfolioItem").title("Портфолио"),
            S.documentTypeListItem("review").title("Отзывы"),
          ]),
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
