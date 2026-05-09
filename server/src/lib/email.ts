import { Resend } from "resend";
import { env } from "@/utils/env";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function buildResetEmailHtml(resetUrl: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your NedAI password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">NedAI</p>
              <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;letter-spacing:0.5px;">Your AI Study Assistant</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</p>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${name},<br/>We received a request to reset the password for your NedAI account.
                Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#0f172a;border-radius:12px;padding:14px 32px;">
                    <a href="${resetUrl}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;color:#3b82f6;word-break:break-all;">
                <a href="${resetUrl}" style="color:#3b82f6;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                © ${new Date().getFullYear()} NedAI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetToken: string;
}): Promise<void> {
  const appUrl = env.APP_URL?.replace(/\/$/, "") || "http://localhost:5173";
  const resetUrl = `${appUrl}/reset-password?token=${opts.resetToken}`;

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM || "NedAI <onboarding@resend.dev>",
    to: opts.to,
    subject: "Reset your NedAI password",
    html: buildResetEmailHtml(resetUrl, opts.name),
  });

  if (error) {
    console.error("[email] Failed to send password reset email:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  console.log(`[email] Password reset email sent to ${opts.to}`);
}

export async function sendNotificationEmail(opts: {
  to: string[];
  subject: string;
  htmlBody: string;
}): Promise<void> {
  // Skip if no API key configured
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email send");
    throw new Error("Email service not configured. Please set RESEND_API_KEY in environment variables.");
  }

  const client = getResendClient();
  const from = env.EMAIL_FROM || "NedAI <onboarding@resend.dev>";
  const failed: string[] = [];

  // Send individual emails (Resend free tier/testing mode requirement)
  for (const email of opts.to) {
    try {
      const { error } = await client.emails.send({
        from,
        to: email,
        subject: opts.subject,
        html: opts.htmlBody,
      });

      if (error) {
        console.error(`[email] Failed to send to ${email}:`, error);
        failed.push(email);
      } else {
        console.log(`[email] Notification sent to ${email}`);
      }
    } catch (err) {
      console.error(`[email] Error sending to ${email}:`, err);
      failed.push(email);
    }
  }

  if (failed.length > 0) {
    // Check if it's the testing mode error
    if (opts.to.length === 1 && failed.length === 1 && !opts.to[0].includes("@")) {
      throw new Error(`Email delivery failed: Invalid email address`);
    }
    // For testing mode, suggest verifying domain
    throw new Error(
      `Failed to send to ${failed.length} recipient(s). ` +
      `Note: Resend testing mode only allows sending to your own email. ` +
      `To send to others, verify a domain at resend.com/domains`
    );
  }

  console.log(`[email] Notification emails sent to ${opts.to.length} users`);
}
