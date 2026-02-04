"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { redirectToAuth } from "@/lib/auth-utils";
import { toast } from "sonner";

interface RedirectingModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  delay?: number; // Delay in milliseconds before redirect
}

export function RedirectingModal({
  isOpen,
  onClose,
  message = "Redirecting you to login...",
  delay = 1500,
}: RedirectingModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        try {
          redirectToAuth('login');
        } catch (error) {
          console.error('Failed to redirect to auth:', error);
          onClose(); // Close modal if redirect fails
          toast.error('Unable to redirect. Please check your connection and try again.');
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, delay, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" hideClose>
        <div className="flex flex-col items-center justify-center gap-6 py-8">
          {/* Loading Spinner */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>

            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-pulse" />
          </div>

          {/* Message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Authentication Required
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {message}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Please wait a moment...
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
