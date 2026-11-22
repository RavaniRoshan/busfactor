import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin-auth";
import { PageFrame, PageIntro } from "@/components/site-chrome";
import { AdminLoginForm } from "./login-form";

export const metadata = {
  title: "Admin login — BusFactor",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdminRequest()) {
    redirect("/admin/metrics");
  }

  return (
    <PageFrame>
      <PageIntro
        eyebrow="Admin"
        title="Sign in"
        text="Use the operator token to access the admin dashboard."
      />
      <div className="mx-auto mt-3xl w-full max-w-article rounded-corner-lg border border-border-secondary bg-surface-secondary-bg p-xl md:p-2xl">
        <AdminLoginForm />
      </div>
    </PageFrame>
  );
}
