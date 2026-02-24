import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure the S3 client for Cloudflare R2
// Values should be provided in the user's .env file:
// R2_ACCOUNT_ID=...
// R2_ACCESS_KEY_ID=...
// R2_SECRET_ACCESS_KEY=...
// R2_BUCKET_NAME=...
// R2_PUBLIC_URL=... (e.g. https://pub-xxxxxxxx.r2.dev)


const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        if (!process.env.R2_BUCKET_NAME) {
            console.warn("R2_BUCKET_NAME is not set. Please configure Cloudflare R2 env vars.");
            return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueId = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 7);
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileKey = `campaign-assets/${uniqueId}-${safeName}`;

        await r2Client.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileKey,
                Body: buffer,
                ContentType: file.type,
            })
        );

        const publicUrl = process.env.R2_PUBLIC_URL
            ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
            : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileKey}`; // Fallback

        return NextResponse.json({
            url: publicUrl,
            id: uniqueId,
            filename: file.name,
            type: file.type
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file to R2" },
            { status: 500 }
        );
    }
}
