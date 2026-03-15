import { logger } from './logger';

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    logger.log(`[otp] DEV — Email OTP for ${email}: ${code}`);
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [email],
      subject: 'Your Viral Payouts verification code',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #7847eb;">Viral Payouts</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7847eb; margin: 24px 0;">
              ${code}
            </div>
            <p style="color: #666;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error(
      `[otp] Resend email failed for ${email}: ${res.status} ${body}`
    );
    throw new Error(`Failed to send OTP email: ${body}`);
  }

  logger.log(`[otp] Email OTP sent to ${email} via Resend`);
}

export interface TwilioVerifyResult {
  sid: string;
  status: string;
}

export async function sendPhoneOTPVerify(
  phone: string,
  countryCode: string
): Promise<TwilioVerifyResult> {
  const fullPhone = `+${countryCode}${phone}`;

  if (process.env.NODE_ENV === 'development') {
    logger.log(`[otp] DEV — Phone verification for ${fullPhone}`);
    return { sid: 'dev-sid', status: 'pending' };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SID;

  if (!twilioSid || !twilioToken || !verifySid) {
    throw new Error('Twilio Verify credentials are not configured');
  }

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: fullPhone,
        Channel: 'sms',
      }).toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    logger.error(
      `[otp] Twilio Verify failed for ${fullPhone}: ${res.status} ${err}`
    );
    throw new Error('Failed to send OTP. Please try again.');
  }

  const data = await res.json();
  logger.log(`[otp] Phone verification sent to ${fullPhone} via Twilio Verify`);

  return {
    sid: data.sid,
    status: data.status,
  };
}

export async function verifyPhoneOTP(
  phone: string,
  countryCode: string,
  code: string
): Promise<boolean> {
  const fullPhone = `+${countryCode}${phone}`;

  if (process.env.NODE_ENV === 'development') {
    const isValid = code === '123456';
    logger.log(
      `[otp] DEV — Phone verification check for ${fullPhone}: ${isValid ? 'approved' : 'invalid'}`
    );
    return isValid;
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SID;

  if (!twilioSid || !twilioToken || !verifySid) {
    throw new Error('Twilio Verify credentials are not configured');
  }

  const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`;
  logger.log(`[otp] Twilio Verify check URL: ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: fullPhone,
      Code: code,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error(
      `[otp] Twilio Verify check failed for ${fullPhone}: ${res.status} ${err}`
    );
    throw new Error('Failed to verify OTP. Please try again.');
  }

  const data = await res.json();
  const isApproved = data.status === 'approved';

  logger.log(
    `[otp] Phone verification check for ${fullPhone}: ${isApproved ? 'approved' : 'invalid'}`
  );

  return isApproved;
}
