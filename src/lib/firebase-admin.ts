/**
 * Firebase Admin SDK initializer (singleton).
 * Reads FIREBASE_* env vars. Used for:
 *   - Sending OTP via Firebase Auth phone sign-in (SMS)
 *   - Sending transactional emails via Firebase Extensions or custom triggers
 *
 * Required .env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (wrap value in double-quotes in .env, include \n for newlines)
 */
import admin from "firebase-admin";

let firebaseApp: admin.app.App | undefined;

export function getFirebaseAdmin(): admin.app.App {
    if (firebaseApp) return firebaseApp;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "[firebase] Missing required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
        );
    }

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });

    return firebaseApp;
}
