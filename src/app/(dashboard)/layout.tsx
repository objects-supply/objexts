import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { getAuthProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/db/schema";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAuthProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <DashboardNav userEmail={profile.username} userRole={profile.role as UserRole} />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
