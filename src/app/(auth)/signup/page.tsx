"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Rocket,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import { OTPType } from "@prisma/client";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode] = useState("91");

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpId, setEmailOtpId] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const sendEmailOTP = trpc.auth.sendEmailOTP.useMutation({
    onSuccess: (data) => {
      setEmailOtpId(data.otpId);
      setEmailOtpSent(true);
      toast.success("Code sent to your email");
    },
    onError: (error) => toast.error(error.message),
  });

  const sendPhoneOTP = trpc.auth.sendPhoneOTP.useMutation({
    onSuccess: () => {
      setPhoneOtpSent(true);
      toast.success("OTP sent to your phone");
    },
    onError: (error) => toast.error(error.message),
  });

  const verifyOTP = trpc.auth.verifyOTPCode.useMutation();
  const register = trpc.auth.register.useMutation();

  const handleVerifyEmailOTP = async () => {
    try {
      const result = await verifyOTP.mutateAsync({
        identifier: email,
        code: emailOtp,
        type: OTPType.EMAIL_VERIFICATION,
      });
      if (result.success) {
        setEmailOtpId(result.otpId);
        setEmailVerified(true);
        toast.success("Email verified!");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid code");
    }
  };

  const handleVerifyPhoneOTP = async () => {
    try {
      const result = await verifyOTP.mutateAsync({
        identifier: phone,
        code: phoneOtp,
        type: OTPType.PHONE_VERIFICATION,
        countryCode,
      });
      if (result.success) {
        setPhoneVerified(true);
        toast.success("Phone verified!");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerified) {
      toast.error("Verify your email");
      return;
    }
    if (!phoneVerified) {
      toast.error("Verify your phone");
      return;
    }

    setIsLoading(true);
    try {
      await register.mutateAsync({
        email,
        phone,
        countryCode,
        password,
        name,
        emailOtpId,
      });
      const result = await signIn("email-password", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        toast.success("Welcome to Viral Payouts!");
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join Viral Payouts and start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <>
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name && email && phone) setStep(2);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted text-sm">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      className="flex-1"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!name || !email || !phone}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                  {emailVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        sendEmailOTP.mutate({
                          email,
                          type: OTPType.EMAIL_VERIFICATION,
                        })
                      }
                      disabled={sendEmailOTP.isPending}
                    >
                      {sendEmailOTP.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : emailOtpSent ? (
                        "Resend"
                      ) : (
                        "Send"
                      )}
                    </Button>
                  )}
                </div>
                {emailOtpSent && !emailVerified && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email OTP"
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      onClick={handleVerifyEmailOTP}
                      disabled={verifyOTP.isPending || emailOtp.length < 6}
                    >
                      {verifyOTP.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">+91 {phone}</span>
                  </div>
                  {phoneVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        sendPhoneOTP.mutate({
                          phone,
                          countryCode,
                          type: OTPType.PHONE_VERIFICATION,
                        })
                      }
                      disabled={sendPhoneOTP.isPending}
                    >
                      {sendPhoneOTP.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : phoneOtpSent ? (
                        "Resend"
                      ) : (
                        "Send"
                      )}
                    </Button>
                  )}
                </div>
                {phoneOtpSent && !phoneVerified && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Phone OTP"
                      value={phoneOtp}
                      onChange={(e) =>
                        setPhoneOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      onClick={handleVerifyPhoneOTP}
                      disabled={verifyOTP.isPending || phoneOtp.length < 6}
                    >
                      {verifyOTP.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!emailVerified || !phoneVerified}
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="inline h-4 w-4 mr-1 text-green-600" />
                {email} & +91 {phone} verified
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || password.length < 6}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Account
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
