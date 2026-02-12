"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/trpc/client";
import { UserRole } from "@prisma/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ChooseRolePage() {
    const router = useRouter();
    const { update } = useSession();
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CREATOR);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setUserRole = trpc.auth.setUserRole.useMutation({
        onSuccess: async () => {
            // Update session to reflect new role
            await update();

            // Redirect to appropriate onboarding
            const redirectPath = selectedRole === UserRole.BRAND
                ? "/brand/onboarding"
                : "/creator/onboarding";

            router.push(redirectPath);
            router.refresh();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to set role");
            setIsSubmitting(false);
        },
    });

    const handleContinue = () => {
        setIsSubmitting(true);
        setUserRole.mutate({ role: selectedRole });
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Choose Your Role</CardTitle>
                    <CardDescription>
                        Select how you want to use Viral Payouts
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedRole(UserRole.CREATOR)}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${selectedRole === UserRole.CREATOR
                                    ? "border-primary bg-primary/5"
                                    : "border-muted hover:border-muted-foreground/30"
                                }`}
                        >
                            <Sparkles className={`h-8 w-8 ${selectedRole === UserRole.CREATOR ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${selectedRole === UserRole.CREATOR ? "text-primary" : ""}`}>Creator</span>
                            <span className="text-xs text-muted-foreground text-center">Earn by promoting brands</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedRole(UserRole.BRAND)}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${selectedRole === UserRole.BRAND
                                    ? "border-primary bg-primary/5"
                                    : "border-muted hover:border-muted-foreground/30"
                                }`}
                        >
                            <Building2 className={`h-8 w-8 ${selectedRole === UserRole.BRAND ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`text-sm font-medium ${selectedRole === UserRole.BRAND ? "text-primary" : ""}`}>Brand</span>
                            <span className="text-xs text-muted-foreground text-center">Run influencer campaigns</span>
                        </button>
                    </div>

                    <Button
                        onClick={handleContinue}
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
