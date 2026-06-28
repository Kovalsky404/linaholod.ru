import { ImageResponse } from "next/og";

/**
 * Favicon — минимальная монограмма «lH», белым на чёрном (в духе макета).
 */

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: -1,
        fontFamily: "sans-serif",
      }}
    >
      lH
    </div>,
    { ...size },
  );
}
