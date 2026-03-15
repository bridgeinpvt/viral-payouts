'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
import { OTPType } from '@prisma/client';

type Step = 'email' | 'verify' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode] = useState('91');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  const sendEmailOTP = trpc.auth.sendEmailOTP.useMutation({
    onSuccess: () => {
      setStep('verify');
      toast.success('Code sent to email');
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyEmailOTP = trpc.auth.verifyOTPCode.useMutation({
    onSuccess: () => {
      setEmailVerified(true);
      toast.success('Email verified!');
    },
    onError: (e) => toast.error(e.message),
  });

  const sendPhoneOTP = trpc.auth.sendPhoneOTP.useMutation({
    onSuccess: () => {
      setPhoneOtpSent(true);
      toast.success('OTP sent to phone');
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyPhoneOTP = trpc.auth.verifyOTPCode.useMutation({
    onSuccess: () => {
      setPhoneVerified(true);
      toast.success('Phone verified!');
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success('Password reset!');
      router.push('/login');
    },
    onError: (e) => toast.error(e.message),
  });

  const canProceed = emailVerified && phoneVerified;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {step === 'email' && 'Verify your identity'}
            {step === 'verify' && 'Complete verification'}
            {step === 'reset' && 'Set new password'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'email' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Registered Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  sendEmailOTP.mutate({ email, type: OTPType.PASSWORD_RESET });
                }}
                disabled={!email || sendEmailOTP.isPending}
              >
                {sendEmailOTP.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" /> {email}
                  </div>
                  {emailVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        sendEmailOTP.mutate({
                          email,
                          type: OTPType.PASSWORD_RESET,
                        })
                      }
                    >
                      Resend
                    </Button>
                  )}
                </div>
                {!emailVerified && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email OTP"
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(
                          e.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                      }
                      maxLength={6}
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        verifyEmailOTP.mutate({
                          identifier: email,
                          code: emailOtp,
                          type: OTPType.PASSWORD_RESET,
                        })
                      }
                      disabled={emailOtp.length < 6 || verifyEmailOTP.isPending}
                    >
                      {verifyEmailOTP.isPending ? (
                        <Loader2 className="h-4 w-4" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" /> +91 {phone}
                  </div>
                  {phoneVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        sendPhoneOTP.mutate({
                          phone,
                          countryCode,
                          type: OTPType.PASSWORD_RESET,
                        })
                      }
                      disabled={phone.length < 10 || sendPhoneOTP.isPending}
                    >
                      {sendPhoneOTP.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : phoneOtpSent ? (
                        'Resend'
                      ) : (
                        'Send'
                      )}
                    </Button>
                  )}
                </div>
                {!phoneVerified && (
                  <>
                    {!phoneOtpSent && (
                      <Input
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) =>
                          setPhone(
                            e.target.value.replace(/\D/g, '').slice(0, 10)
                          )
                        }
                        maxLength={10}
                      />
                    )}
                    {phoneOtpSent && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Phone OTP"
                          value={phoneOtp}
                          onChange={(e) =>
                            setPhoneOtp(
                              e.target.value.replace(/\D/g, '').slice(0, 6)
                            )
                          }
                          maxLength={6}
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            verifyPhoneOTP.mutate({
                              identifier: phone,
                              code: phoneOtp,
                              type: OTPType.PHONE_VERIFICATION,
                              countryCode,
                            })
                          }
                          disabled={
                            phoneOtp.length < 6 || verifyPhoneOTP.isPending
                          }
                        >
                          {verifyPhoneOTP.isPending ? (
                            <Loader2 className="h-4 w-4" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => setStep('reset')}
                disabled={!canProceed}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'reset' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword === confirmPassword)
                  resetPassword.mutate({ email, code: emailOtp, newPassword });
                else toast.error("Passwords don't match");
              }}
              className="space-y-3"
            >
              <div className="rounded-lg bg-muted p-2 text-xs text-center">
                <CheckCircle2 className="inline h-3 w-3 mr-1 text-green-600" />{' '}
                {email} & +91{phone} verified
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resetPassword.isPending || newPassword.length < 6}
              >
                {resetPassword.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reset Password
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Remember password?{' '}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
