import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getDashboardPath } from "@/lib/rbac";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(getDashboardPath(session.user));
  } else {
    redirect("/marketplace");
  }
}
