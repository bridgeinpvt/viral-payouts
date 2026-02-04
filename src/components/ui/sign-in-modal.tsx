"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function SignInModal({
  isOpen,
  onClose,
  title = "Sign In Required",
  description = "You need to sign in to access this feature.",
}: SignInModalProps) {
  const handleSignIn = () => {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `${authUrl}/login?callbackUrl=${callbackUrl}`;
  };

  const handleSignUp = () => {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `${authUrl}/signup?callbackUrl=${callbackUrl}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSignIn}
            size="lg"
            className="w-full"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>

          <Button
            onClick={handleSignUp}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create Account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
