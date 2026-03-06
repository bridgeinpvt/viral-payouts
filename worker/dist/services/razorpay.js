"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpay = void 0;
exports.createPayout = createPayout;
const razorpay_1 = __importDefault(require("razorpay"));
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.razorpay = razorpay;
async function createPayout(params) {
    const { fundAccountId, amount, referenceId, narration } = params;
    const payout = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        mode: "UPI", // Default to UPI
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: referenceId,
        narration,
    });
    return payout;
}
//# sourceMappingURL=razorpay.js.map