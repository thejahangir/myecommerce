import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, receipt, notes } = body;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid grand total amount provided." },
        { status: 400 }
      );
    }

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // Detect if test keys are configured or still placeholders
    const isPlaceholder =
      !key_id ||
      !key_secret ||
      key_id.includes("placeholder") ||
      key_secret.includes("placeholder");

    const total = numericAmount;
    // Amount in Razorpay must be an integer in the smallest currency sub-unit: Paisa (total * 100)
    const amountInPaisa = Math.round(total * 100);

    if (isPlaceholder) {
      // In sandbox preview / placeholder mode, return a simulated order token
      const mockOrderId = `order_sim_${Date.now()}`;
      return NextResponse.json({
        id: mockOrderId,
        amount: amountInPaisa,
        currency: "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
        status: "created",
        isPlaceholder: true,
        key_id: key_id || "rzp_test_placeholder_key_id",
      });
    }

    // Initialize official Razorpay client
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100), // Converted to Paisa (total * 100)
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
      notes: notes || {
        store: "ApexStore",
      },
    });

    return NextResponse.json({
      ...order,
      key_id,
    });
  } catch (err: unknown) {
    console.error("Razorpay Order Creation Error:", err);
    const message = err instanceof Error ? err.message : "Failed to create Razorpay order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
