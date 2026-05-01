import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM ?? "Ventec <noreply@updates.stinson.in>";

export type EmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

/** Sends an email via Resend. Returns true on success, false otherwise.
 *  Failures are logged but never throw — callers should treat email as
 *  best-effort so a missing RESEND_API_KEY doesn't block submissions. */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping send to",
      params.to,
    );
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[email] resend error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] unexpected error:", e);
    return false;
  }
}
