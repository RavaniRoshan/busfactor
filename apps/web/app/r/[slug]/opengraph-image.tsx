import { ImageResponse } from "next/og";
import { store } from "@/lib/store";

export const alt = "BusFactor report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = await store.reports.get(slug);
  const score = (stored?.report as { score?: number } | undefined)?.score ?? 0;
  const verdict = (stored?.report as { verdict?: string } | undefined)?.verdict ?? "unknown";
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>BusFactor</div>
        <div style={{ fontSize: 120, fontWeight: 700 }}>{score}/100</div>
        <div>{verdict}</div>
      </div>
    ),
    size,
  );
}
