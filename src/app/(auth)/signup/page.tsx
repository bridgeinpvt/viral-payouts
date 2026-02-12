"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Mail, Phone, Eye, EyeOff, Loader2, CheckCircle2, Building2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import { OTPType, UserRole } from "@prisma/client";

export default function SignupPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CREATOR);

  // Email signup state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpId, setEmailOtpId] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // Phone signup state
  const [phoneName, setPhoneName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode] = useState("91");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpId, setPhoneOtpId] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // tRPC mutations
  const sendEmailOTP = trpc.auth.sendEmailOTP.useMutation({
    onSuccess: (data) => {
      setEmailOtpId(data.otpId);
      setEmailOtpSent(true);
      toast.success("Verification code sent to your email");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send verification code");
    },
  });

  const sendPhoneOTP = trpc.auth.sendPhoneOTP.useMutation({
    onSuccess: (data) => {
      setPhoneOtpId(data.otpId);
      setPhoneOtpSent(true);
      toast.success("OTP sent to your phone");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send OTP");
    },
  });

  const verifyOTP = trpc.auth.verifyOTPCode.useMutation();
  const registerEmail = trpc.auth.registerWithEmail.useMutation();
  const registerPhone = trpc.auth.registerWithPhone.useMutation();

  const handleSendEmailOTP = () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    sendEmailOTP.mutate({ email, type: OTPType.EMAIL_VERIFICATION });
  };

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

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerified) {
      toast.error("Please verify your email first");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await registerEmail.mutateAsync({
        email,
        password,
        name,
        otpId: emailOtpId,
        role: selectedRole,
      });

      // Auto sign-in after registration
      const result = await signIn("email-password", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Registration successful but auto-login failed. Please sign in.");
        router.push("/login");
      } else {
        toast.success("Account created successfully!");
        router.push("/onboarding");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneOTP = () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    sendPhoneOTP.mutate({
      phone,
      countryCode,
      type: OTPType.PHONE_VERIFICATION,
    });
  };

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verify OTP first
      const verifyResult = await verifyOTP.mutateAsync({
        identifier: phone,
        code: phoneOtp,
        type: OTPType.PHONE_VERIFICATION,
      });

      if (verifyResult.success) {
        // Register
        await registerPhone.mutateAsync({
          phone,
          countryCode,
          name: phoneName,
          otpId: verifyResult.otpId,
          role: selectedRole,
        });

        // Auto sign-in
        const result = await signIn("phone-otp", {
          phone,
          countryCode,
          otpId: verifyResult.otpId,
          redirect: false,
        });

        if (result?.error) {
          toast.error("Registration successful but auto-login failed. Please sign in.");
          router.push("/login");
        } else {
          toast.success("Account created successfully!");
          router.push("/onboarding");
          router.refresh();
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/onboarding" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Join Viral Payouts and start your journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">I am a</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.CREATOR)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  selectedRole === UserRole.CREATOR
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <Sparkles className={`h-6 w-6 ${selectedRole === UserRole.CREATOR ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${selectedRole === UserRole.CREATOR ? "text-primary" : ""}`}>Creator</span>
                <span className="text-xs text-muted-foreground text-center">Earn by promoting brands</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.BRAND)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  selectedRole === UserRole.BRAND
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <Building2 className={`h-6 w-6 ${selectedRole === UserRole.BRAND ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${selectedRole === UserRole.BRAND ? "text-primary" : ""}`}>Brand</span>
                <span className="text-xs text-muted-foreground text-center">Run influencer campaigns</span>
              </button>
            </div>
          </div>

          {/* Google Sign Up */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>

          {/* Signup Method Tabs */}
          <Tabs value={signupMethod} onValueChange={(v) => setSignupMethod(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={emailVerified}
                      className="flex-1"
                    />
                    {!emailVerified && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSendEmailOTP}
                        disabled={sendEmailOTP.isPending || !email || emailOtpSent}
                        className="shrink-0"
                      >
                        {sendEmailOTP.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : emailOtpSent ? "Sent" : "Verify"}
                      </Button>
                    )}
                    {emailVerified && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-2.5" />
                    )}
                  </div>
                </div>

                {emailOtpSent && !emailVerified && (
                  <div className="space-y-2">
                    <Label htmlFor="email-otp">Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-otp"
                        placeholder="123456"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyEmailOTP}
                        disabled={verifyOTP.isPending || emailOtp.length < 6}
                        className="shrink-0"
                      >
                        {verifyOTP.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : "Verify"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !emailVerified || !name || !password}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhoneSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-name">Full Name</Label>
                  <Input
                    id="phone-name"
                    placeholder="Your name"
                    value={phoneName}
                    onChange={(e) => setPhoneName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted text-sm">
                      +91
                    </div>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      disabled={phoneOtpSent}
                    />
                  </div>
                </div>

                {!phoneOtpSent ? (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleSendPhoneOTP}
                    disabled={sendPhoneOTP.isPending || phone.length < 10 || !phoneName}
                  >
                    {sendPhoneOTP.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send OTP
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone-otp">Enter OTP</Label>
                      <Input
                        id="phone-otp"
                        placeholder="123456"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        OTP sent to +91 {phone}
                        <button
                          type="button"
                          className="ml-2 text-primary underline"
                          onClick={() => { setPhoneOtpSent(false); setPhoneOtp(""); }}
                        >
                          Change
                        </button>
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || phoneOtp.length < 6}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
