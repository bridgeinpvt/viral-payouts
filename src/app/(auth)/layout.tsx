import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getDashboardPath } from "@/lib/rbac";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session) {
    const isOnboarded = session.user?.isOnboarded;
    if (isOnboarded) {
      redirect(getDashboardPath(session));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
