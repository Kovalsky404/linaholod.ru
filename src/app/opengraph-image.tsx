import { ImageResponse } from "next/og";

/**
 * OG-картинка (1200×630), чёрно-белый минимализм в духе макета:
 * крупная надпись «lina H.» + подпись «персональный стилист».
 *
 * Шрифт — встроенный по умолчанию в next/og (без сетевых зависимостей,
 * чтобы сборка не падала при отсутствии доступа к Google Fonts).
 */

export const alt = "lina H. — персональный стилист";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Верх: монограмма-метка */}
      <div
        style={{
          fontSize: 28,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#737373",
        }}
      >
        персональный стилист
      </div>

      {/* Центр-низ: гигантский логотип */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 240,
            fontWeight: 700,
            letterSpacing: -4,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          lina H.
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#d9d9d9",
          }}
        >
          Лина Холод · стиль · шопинг · гардероб
        </div>
      </div>
    </div>,
    { ...size },
  );
}
