"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { redirectToAuth } from "@/lib/auth-utils";

interface LoginToSeeMoreProps {
  message?: string;
  className?: string;
  onSignInClick?: () => void;
}

export function LoginToSeeMore({
  message = "Sign in to see more content",
  className = "",
  onSignInClick,
}: LoginToSeeMoreProps) {

  return (
    <div
      className={`relative w-full h-64 mt-8 rounded-lg overflow-hidden ${className}`}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/60 to-transparent backdrop-blur-sm" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-center space-y-2">
          <LogIn className="h-12 w-12 mx-auto text-white" />
          <h3 className="text-xl font-semibold text-white">
            {message}
          </h3>
          <p className="text-sm text-white/90 max-w-md">
            Create an account or sign in to explore more content and unlock all features
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => onSignInClick ? onSignInClick() : redirectToAuth('login')}
            size="lg"
            variant="secondary"
            className="font-semibold"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign In
          </Button>
          <Button
            onClick={() => redirectToAuth('signup')}
            size="lg"
            className="font-semibold"
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
}
