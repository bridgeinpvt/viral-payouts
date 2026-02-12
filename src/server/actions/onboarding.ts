"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { db } from "../db";
import { revalidatePath } from "next/cache";

export type Role = "BRAND" | "CREATOR";

export async function setUserRole(role: Role) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    try {
        // Enable both roles (user can switch between them)
        // Set the selected role as the active/initial role
        await db.user.update({
            where: { id: userId },
            data: {
                isBrand: true,
                isCreator: true,
                activeRole: role,
                isOnboarded: true,
            },
        });

        // Create both profiles so the user can switch roles freely
        const existingBrandProfile = await db.brandProfile.findUnique({
            where: { userId },
        });
        if (!existingBrandProfile) {
            await db.brandProfile.create({
                data: { userId },
            });
        }

        const existingCreatorProfile = await db.creatorProfile.findUnique({
            where: { userId },
        });
        if (!existingCreatorProfile) {
            await db.creatorProfile.create({
                data: { userId },
            });
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error setting user role:", error);
        return { success: false, error: "Failed to update user role" };
    }
}
