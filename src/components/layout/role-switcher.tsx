"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { Building2, User } from "lucide-react";
import { toast } from "sonner";

export function RoleSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const activeRole = (session?.user as any)?.activeRole || "CREATOR";

  const switchRoleMutation = trpc.auth.switchRole.useMutation({
    onSuccess: async (data) => {
      await update(); // Refresh session
      toast.success(`Switched to ${data.activeRole === "BRAND" ? "Brand" : "Creator"} view`);
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to switch role");
    },
  });

  const handleSwitch = (role: "BRAND" | "CREATOR") => {
    if (role === activeRole) return;
    switchRoleMutation.mutate({ role });
  };

  return (
    <div className="flex rounded-lg bg-muted p-1">
      <button
        onClick={() => handleSwitch("CREATOR")}
        disabled={switchRoleMutation.isPending}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
          activeRole === "CREATOR"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="h-4 w-4" />
        Creator
      </button>
      <button
        onClick={() => handleSwitch("BRAND")}
        disabled={switchRoleMutation.isPending}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
          activeRole === "BRAND"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="h-4 w-4" />
        Brand
      </button>
    </div>
  );
}
