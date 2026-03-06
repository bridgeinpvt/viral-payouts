"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePayouts = executePayouts;
const db_1 = require("../db");
const razorpay_1 = require("../services/razorpay");
async function executePayouts() {
    // Find all approved payouts that haven't been processed yet
    const pendingPayouts = await db_1.db.payout.findMany({
        where: {
            approvalStatus: "APPROVED",
            status: "PENDING",
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    wallet: {
                        select: { id: true, type: true },
                    },
                },
            },
            paymentMethod: true,
        },
        take: 20, // Process in batches
    });
    if (pendingPayouts.length === 0) {
        console.log("[payout-executor] No pending payouts to process");
        return;
    }
    console.log(`[payout-executor] Processing ${pendingPayouts.length} payouts`);
    for (const payout of pendingPayouts) {
        try {
            // Mark as processing
            await db_1.db.payout.update({
                where: { id: payout.id },
                data: { status: "PROCESSING" },
            });
            if (!payout.paymentMethod) {
                console.error(`[payout-executor] No payment method for payout ${payout.id}`);
                await db_1.db.payout.update({
                    where: { id: payout.id },
                    data: { status: "FAILED", failedReason: "No payment method configured" },
                });
                continue;
            }
            // Execute via Razorpay
            const razorpayPayout = await (0, razorpay_1.createPayout)({
                fundAccountId: payout.paymentMethod.details,
                amount: payout.netAmount ?? payout.amount,
                referenceId: payout.id,
                narration: `Payout for ${payout.user.name ?? "creator"}`,
            });
            // Update payout with Razorpay reference
            await db_1.db.payout.update({
                where: { id: payout.id },
                data: {
                    status: "COMPLETED",
                    processedAt: new Date(),
                    razorpayPayoutId: razorpayPayout.id,
                },
            });
            // Create transaction record for the creator wallet
            const creatorWallet = payout.user.wallet;
            if (creatorWallet && creatorWallet.type === "CREATOR") {
                await db_1.db.transaction.create({
                    data: {
                        walletId: creatorWallet.id,
                        type: "WITHDRAWAL",
                        amount: -(payout.netAmount ?? payout.amount),
                        status: "COMPLETED",
                        description: `Payout processed - ${payout.id}`,
                        referenceId: payout.id,
                        referenceType: "PAYOUT",
                    },
                });
            }
            console.log(`[payout-executor] Payout ${payout.id} completed: ₹${payout.netAmount ?? payout.amount}`);
        }
        catch (error) {
            console.error(`[payout-executor] Failed payout ${payout.id}:`, error);
            await db_1.db.payout.update({
                where: { id: payout.id },
                data: {
                    status: "FAILED",
                    failedReason: error instanceof Error ? error.message : "Unknown error",
                },
            });
        }
    }
}
//# sourceMappingURL=payout-executor.js.map