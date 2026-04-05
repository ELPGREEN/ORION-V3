import { supabase } from "@/integrations/supabase/client";

/**
 * Reports a completed payment to the Mother Network for commission tracking.
 * Uses the dedicated report-payment-to-mother edge function.
 * Non-blocking — failures are logged but don't interrupt payment flow.
 */
export async function reportPaymentToMother(payment: {
  stripe_payment_id: string;
  customer_email?: string;
  customer_name?: string;
  amount_cents: number;
  currency?: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: { action: "report_to_mother", ...payment },
    });

    if (error) {
      console.warn("[COMMISSION] Failed to report to mother:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[COMMISSION] Payment reported to mother network");
    return { success: true, data };
  } catch (e) {
    // Never block the payment flow
    console.warn("[COMMISSION] Failed to report to mother:", e);
    return { success: false, error: String(e) };
  }
}
