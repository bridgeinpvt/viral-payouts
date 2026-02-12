"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setUserRole, Role } from "@/server/actions/onboarding";
import { toast } from "sonner"; // Assuming sonner is installed, otherwise standard alert

export default function OnboardingPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const handleRoleSelection = async (role: Role) => {
        try {
            setIsUpdating(true);
            const result = await setUserRole(role);

            if (result.success) {
                // Force session update to reflect new role
                await update();
                router.refresh();
                router.push("/dashboard");
            } else {
                alert("Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred. Please check your connection.");
        } finally {
            setIsUpdating(false);
        }
    };

    if (status === "loading" || isUpdating) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{isUpdating ? "Setting up your account..." : "Loading..."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Welcome to Viral Payouts! 🎉</h1>
                    <p className="text-xl text-muted-foreground">
                        Let's get you set up
                    </p>
                </div>

                <div className="rounded-lg border bg-card p-8 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Choose Your Role</h2>
                        <p className="text-muted-foreground">
                            Are you a brand looking to run campaigns, or a creator looking to earn?
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            onClick={() => handleRoleSelection("BRAND")}
                            disabled={isUpdating}
                            className="group relative overflow-hidden rounded-lg border-2 border-primary/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 text-left transition-all hover:border-primary/40 hover:shadow-lg disabled:opacity-50"
                        >
                            <div className="space-y-2">
                                <div className="text-4xl">🎯</div>
                                <h3 className="text-xl font-semibold">I'm a Brand</h3>
                                <p className="text-sm text-muted-foreground">
                                    Create campaigns and connect with creators
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleRoleSelection("CREATOR")}
                            disabled={isUpdating}
                            className="group relative overflow-hidden rounded-lg border-2 border-primary/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 text-left transition-all hover:border-primary/40 hover:shadow-lg disabled:opacity-50"
                        >
                            <div className="space-y-2">
                                <div className="text-4xl">✨</div>
                                <h3 className="text-xl font-semibold">I'm a Creator</h3>
                                <p className="text-sm text-muted-foreground">
                                    Join campaigns and start earning
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            Don't worry, you can change this later in your settings
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
