import { ScanPageTracker } from "@/components/analytics-provider";
import { PageFrame, PageIntro } from "@/components/site-chrome";
import { ScanForm } from "@/components/scan-form";

export const metadata = {
  title: "Scan a repository — BusFactor",
  description: "Scan a public GitHub repository with BusFactor and get an operability verdict.",
};

export default function ScanPage() {
  return (
    <PageFrame>
      <ScanPageTracker />
      <PageIntro
        eyebrow="No signup"
        title="Scan a repository"
        text="Get an operability verdict, a risk map, an OPERATE.md draft, and the questions only the author can answer."
      />
      <ScanForm />
      <p className="mt-xl text-center text-label-sm text-text-secondary">
        New here? <a href="/docs" className="font-medium text-text-primary underline underline-offset-4">Read the quickstart</a>. For local folders, use the CLI.
      </p>
    </PageFrame>
  );
}
