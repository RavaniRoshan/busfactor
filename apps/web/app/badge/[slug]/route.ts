import { store } from "@/lib/store";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const stored = await store.reports.get(slug);
  const score = (stored?.report as { score?: number } | undefined)?.score ?? 0;
  const color = score >= 85 ? "#4c1" : score >= 70 ? "#97ca00" : score >= 50 ? "#dfb317" : "#e05d44";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" fill="#555"/><rect x="70" width="50" height="20" fill="${color}"/><text x="35" y="14" fill="#fff" font-size="11" text-anchor="middle">busfactor</text><text x="95" y="14" fill="#fff" font-size="11" text-anchor="middle">${score}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
}
