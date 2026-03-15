'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
import { OTPType } from '@prisma/client';

export default function VerifyPhonePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [countryCode] = useState('91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);

  const sendPhoneOTP = trpc.auth.sendPhoneOTP.useMutation({
    onSuccess: () => {
      setOtpSent(true);
      toast.success('OTP sent');
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOTP = trpc.auth.verifyOTPCode.useMutation({
    onSuccess: async () => {
      setVerified(true);
      toast.success('Phone verified!');
      await updateSession();
      setTimeout(() => router.push('/'), 1500);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!session)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            Please sign in first
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Phone className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Verify Phone</CardTitle>
          <CardDescription>Google accounts must verify phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="mt-2 text-green-600 font-medium">
                Verified! Redirecting...
              </p>
            </div>
          ) : (
            <>
              {!otpSent ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
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
                          setPhone(
                            e.target.value.replace(/\D/g, '').slice(0, 10)
                          )
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      sendPhoneOTP.mutate({
                        phone,
                        countryCode,
                        type: OTPType.PHONE_VERIFICATION,
                      })
                    }
                    disabled={phone.length < 10 || sendPhoneOTP.isPending}
                  >
                    {sendPhoneOTP.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send OTP
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sent to +91 {phone}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      verifyOTP.mutate({
                        identifier: phone,
                        code: otp,
                        type: OTPType.PHONE_VERIFICATION,
                        countryCode,
                      })
                    }
                    disabled={otp.length < 6 || verifyOTP.isPending}
                  >
                    {verifyOTP.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Verify
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                  >
                    Change Phone Number
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
