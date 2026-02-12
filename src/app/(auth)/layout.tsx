import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If user is authenticated and already onboarded, redirect to dashboard
  // If user is authenticated but NOT onboarded, allow them to access onboarding page
  if (session) {
    const isOnboarded = (session.user as any)?.isOnboarded;
    if (isOnboarded) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
