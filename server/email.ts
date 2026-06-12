import nodemailer from 'nodemailer';

// Lazy-create the transporter so it only initializes when needed
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    console.warn('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — emails will be skipped');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
  
  return transporter;
}

export async function sendInviteEmail(params: {
  to: string;
  registrantName: string;
  firmName: string;
  inviteLink: string;
}): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // Graceful fallback — still log the link so you can manually send it
    console.log(`\n[EMAIL SKIPPED — configure GMAIL_APP_PASSWORD]\nTo: ${params.to}\nInvite Link: ${params.inviteLink}\n`);
    return;
  }

  try {
    await t.sendMail({
      from: `"Docket Platform" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: `Your Docket firm workspace is ready — ${params.firmName}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
            <h1 style="color:#38bdf8;margin:0;font-size:18px;letter-spacing:2px;">DOCKET</h1>
          </div>
          <h2 style="color:#0f172a;font-size:20px;">Hello ${params.registrantName},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            Your firm registration for <strong>${params.firmName}</strong> has been reviewed and approved.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            Click the button below to complete your setup. You will sign in with the Google account 
            associated with <strong>${params.to}</strong>.
          </p>
          <a href="${params.inviteLink}" 
             style="display:inline-block;background:#0f172a;color:#38bdf8;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:16px 0;">
            ACCEPT INVITATION &amp; SET UP WORKSPACE
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
            This link expires in 48 hours. Do not share it.<br/>
            If you did not request this, ignore this email.
          </p>
        </div>
      `
    });
    console.log(`[Email] Invite sent to ${params.to}`);
  } catch (err) {
    console.error('[Email] Failed to send invite:', err);
  }
}

export async function sendSuperadminLoginAlert(params: {
  ip: string;
  timestamp: string;
}): Promise<void> {
  const t = getTransporter();
  const to = process.env.SUPERADMIN_EMAIL;
  if (!t || !to) return;

  try {
    await t.sendMail({
      from: `"Docket Security" <${process.env.GMAIL_USER}>`,
      to,
      subject: '🔐 Docket: Superadmin login detected',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:24px;">
          <h2 style="color:#dc2626;">Security Alert</h2>
          <p>A superadmin login was detected:</p>
          <ul>
            <li><strong>Time:</strong> ${params.timestamp}</li>
            <li><strong>IP Address:</strong> ${params.ip}</li>
          </ul>
          <p style="color:#dc2626;font-weight:bold;">
            If this was not you, log in and use the panic button immediately.
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('[Email] Failed to send login alert:', err);
  }
}
