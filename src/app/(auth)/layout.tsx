import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
