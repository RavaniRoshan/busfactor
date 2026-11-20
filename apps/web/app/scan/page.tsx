import { PageFrame, PageIntro } from "@/components/site-chrome";
import { ScanForm } from "@/components/scan-form";

export const metadata = {
  title: "Scan a repository — BusFactor",
  description: "Point BusFactor at a local path or public GitHub URL and get an operability verdict.",
};

export default function ScanPage() {
  return (
    <PageFrame>
      <PageIntro
        eyebrow="No signup"
        title="Scan a repository"
        text="Get an operability verdict, a risk map, an OPERATE.md draft, and the questions only the author can answer."
      />
      <ScanForm />
    </PageFrame>
  );
}
