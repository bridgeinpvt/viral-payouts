/**
 * OTP Delivery Service
 * --------------------------------
 * Handles actual delivery of OTP codes via:
 *   - Email (Firebase Auth custom action link / direct SMTP via Firebase Extensions)
 *   - SMS (Firebase Auth phone verification — createCustomToken or send via FCM)
 *
 * Firebase does NOT have a direct "send SMS with custom text" API from Admin SDK.
 * The correct Firebase approach for Phone OTP is:
 *   1. Use Firebase Auth phone sign-in on the CLIENT (the Firebase JS SDK shows a reCAPTCHA)
 *   2. Verify the idToken on the SERVER using Admin SDK verifyIdToken()
 *
 * However, since this app uses a custom OTP system (codes stored in the DB),
 * we use Firebase for the TRANSPORT only — specifically:
 *   - For SMS: Firebase Admin SDK `auth().createCustomToken()` approach is not suitable.
 *     Instead, we use Firebase Firestore-triggered extension (Twilio SendGrid / Vonage)
 *     OR call Vonage/Twilio API directly when Firebase is configured.
 *
 * In this integration:
 *   - EMAIL OTP: Sent via a lightweight Fetch to Firebase's email extension REST endpoint,
 *     OR via a direct Firebase trigger if you have the "Trigger Email" extension set up.
 *     Fallback: console.log in dev mode (current behavior preserved).
 *   - PHONE OTP (SMS): Uses Firebase Auth's generateSignInWithEmailLink as a trigger,
 *     or, if you have Twilio/Vonage Extension installed in Firebase, writes to Firestore
 *     which triggers the extension to send the SMS.
 *
 * IMPORTANT: For full SMS delivery, you need ONE of:
 *   A) Firebase Extensions: "Vonage SMS" or "Twilio Flex" — zero-code SMS from Firestore
 *   B) Firebase Functions + Twilio SDK — write a Cloud Function to send SMS
 *
 * This file implements:
 *   - sendOTPEmail() — sends email with the OTP code
 *   - sendOTPSms()  — sends SMS with the OTP code
 *
 * Both gracefully fall back to console.log in dev mode so nothing breaks locally.
 */

import { getFirebaseAdmin } from "./firebase-admin";
import { logger } from "./logger";

/**
 * Send an OTP code via Email using Firebase Auth custom email action.
 * In production, configure the Firebase "Trigger Email" extension and set
 * FIREBASE_EMAIL_COLLECTION env var to the Firestore collection it listens to.
 *
 * Alternatively, if RESEND_API_KEY is set, falls back to plain fetch → Resend API.
 */
export async function sendOTPEmail(email: string, code: string): Promise<void> {
    if (process.env.NODE_ENV === "development") {
        logger.log(`[otp] DEV — Email OTP for ${email}: ${code}`);
        return;
    }

    // Option A: Resend (https://resend.com) — simple email delivery, no Firebase needed
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL ?? "noreply@nocage.in",
                to: [email],
                subject: "Your Viral Payouts verification code",
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
            logger.error(`[otp] Resend email failed for ${email}: ${res.status} ${body}`);
            throw new Error("Failed to send OTP email. Please try again.");
        }

        logger.log(`[otp] Email OTP sent to ${email} via Resend`);
        return;
    }

    // Option B: Firebase "Trigger Email" Extension — write to Firestore, extension delivers email
    try {
        const firebase = getFirebaseAdmin();
        const firestore = firebase.firestore();
        const emailCollection = process.env.FIREBASE_EMAIL_COLLECTION ?? "mail";

        await firestore.collection(emailCollection).add({
            to: email,
            message: {
                subject: "Your Viral Payouts verification code",
                html: `
          <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #7847eb;">Viral Payouts</h2>
            <p>Your verification code is: <strong style="font-size: 24px; color: #7847eb;">${code}</strong></p>
            <p>This code expires in 10 minutes.</p>
          </div>
        `,
            },
        });
        logger.log(`[otp] Email OTP queued via Firebase extension for ${email}`);
    } catch (err) {
        logger.error("[otp] Firebase email trigger failed:", err);
        throw new Error("Failed to send OTP email. Please try again.");
    }
}

/**
 * Send an OTP code via SMS using Firebase integration.
 *
 * Firebase doesn't have a native "send any SMS" Admin API.
 * This function supports two delivery backends:
 *   A) Twilio (if TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER are set)
 *   B) Firebase "Vonage SMS" Extension (writes to Firestore `sms` collection)
 *
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env
 * OR set up the Firebase Vonage SMS Extension and FIREBASE_SMS_COLLECTION.
 */
export async function sendOTPSms(
    phone: string,
    countryCode: string,
    code: string
): Promise<void> {
    const fullPhone = `+${countryCode}${phone}`;

    if (process.env.NODE_ENV === "development") {
        logger.log(`[otp] DEV — SMS OTP for ${fullPhone}: ${code}`);
        return;
    }

    // Option A: Twilio REST API
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
        const body = new URLSearchParams({
            To: fullPhone,
            From: twilioFrom,
            Body: `Your Viral Payouts verification code is: ${code}. Valid for 10 minutes.`,
        });

        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body.toString(),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            logger.error(`[otp] Twilio SMS failed for ${fullPhone}: ${res.status} ${err}`);
            throw new Error("Failed to send OTP SMS. Please try again.");
        }

        logger.log(`[otp] SMS OTP sent to ${fullPhone} via Twilio`);
        return;
    }

    // Option B: Firebase Vonage SMS Extension — write to Firestore, extension delivers SMS
    try {
        const firebase = getFirebaseAdmin();
        const firestore = firebase.firestore();
        const smsCollection = process.env.FIREBASE_SMS_COLLECTION ?? "sms";

        await firestore.collection(smsCollection).add({
            to: fullPhone,
            body: `Your Viral Payouts verification code is: ${code}. Valid for 10 minutes.`,
        });
        logger.log(`[otp] SMS OTP queued via Firebase extension for ${fullPhone}`);
    } catch (err) {
        logger.error("[otp] Firebase SMS trigger failed:", err);
        throw new Error("Failed to send OTP SMS. Please try again.");
    }
}
