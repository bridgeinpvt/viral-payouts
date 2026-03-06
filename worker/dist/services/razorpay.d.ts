import Razorpay from "razorpay";
declare const razorpay: Razorpay;
export interface PayoutParams {
    fundAccountId: string;
    amount: number;
    referenceId: string;
    narration: string;
}
export declare function createPayout(params: PayoutParams): Promise<any>;
export { razorpay };
//# sourceMappingURL=razorpay.d.ts.map