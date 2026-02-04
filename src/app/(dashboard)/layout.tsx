import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Check if user needs onboarding
  const isOnboarded = (session.user as any)?.isOnboarded;
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-[260px]">
        <div className="container mx-auto max-w-7xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
