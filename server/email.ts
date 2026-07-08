import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — emails will be skipped');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

// Sandbox sender — works immediately, no domain setup needed.
// NOTE: until you verify a real domain on Resend, this can only deliver
// to the email address your Resend account was signed up with.
// Scalable: configure once via env vars, never hardcode a domain in code again.
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Docket Platform';
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'docket@contact.brightseo.live';
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;
const REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.GMAIL_USER || 'voyyagic@gmail.com';

export async function sendInviteEmail(params: {
  to: string;
  registrantName: string;
  firmName: string;
  inviteLink: string;
}): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.log(`\n[EMAIL SKIPPED — configure RESEND_API_KEY]\nTo: ${params.to}\nInvite Link: ${params.inviteLink}\n`);
    return false;
  }

  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
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

    if (result.error) {
      console.error('[Email] ❌ Resend rejected invite email:', JSON.stringify(result.error));
      return false;
    }
    console.log(`[Email] ✅ Invite sent to ${params.to} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error('[Email] ❌ FAILED TO SEND INVITE to', params.to);
    console.error('[Email] Error:', err?.message || err);
    return false;
  }
}

export async function sendTeamInviteEmail(params: {
  to: string;
  name: string;
  firmName: string;
  role: string;
  allowedPages: string[] | null;
  inviteLink: string;
}): Promise<boolean> {
  const client = getResendClient();
  const pageLabels: Record<string, string> = {
    dashboard: 'Dashboard', cases: 'Cases', clients: 'Clients', reminders: 'Deadlines & Reminders',
    updates: 'Client Updates', documents: 'Documents', chat: 'Team Chat', settings: 'Settings'
  };
  const pagesText = params.allowedPages && params.allowedPages.length
    ? params.allowedPages.map(p => pageLabels[p] || p).join(', ')
    : 'Full firm access';

  if (!client) {
    console.log(`\n[EMAIL SKIPPED — configure RESEND_API_KEY]\nTo: ${params.to}\nAccess: ${pagesText}\nInvite Link: ${params.inviteLink}\n`);
    return false;
  }

  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `You've been added to ${params.firmName} on Docket`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
            <h1 style="color:#38bdf8;margin:0;font-size:18px;letter-spacing:2px;">DOCKET</h1>
          </div>
          <h2 style="color:#0f172a;font-size:20px;">Hello ${params.name || 'there'},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            You've been added to <strong>${params.firmName}</strong> as a <strong>${params.role}</strong>.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            You'll have access to: <strong>${pagesText}</strong>.
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            Click below to sign in with your Google account at <strong>${params.to}</strong> — no separate signup needed.
          </p>
          <a href="${params.inviteLink}"
             style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:16px 0;">
            ACCEPT &amp; SIGN IN WITH GOOGLE
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
            This link expires in 48 hours. Do not share it.
          </p>
        </div>
      `
    });

    if (result.error) {
      console.error('[Email] ❌ Resend rejected team invite:', JSON.stringify(result.error));
      return false;
    }
    console.log(`[Email] ✅ Team invite sent to ${params.to} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error('[Email] ❌ FAILED TO SEND TEAM INVITE to', params.to);
    console.error('[Email] Error:', err?.message || err);
    return false;
  }
}

export async function sendSuperadminLoginAlert(params: {
  ip: string;
  timestamp: string;
}): Promise<void> {
  const client = getResendClient();
  const to = process.env.SUPERADMIN_EMAIL;
  if (!client || !to) return;

  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: REPLY_TO,
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
    if (result.error) {
      console.error('[Email] ❌ Resend rejected login alert:', JSON.stringify(result.error));
    } else {
      console.log(`[Email] ✅ Login alert sent to ${to}`);
    }
  } catch (err: any) {
    console.error('[Email] ❌ Failed to send login alert:', err?.message || err);
  }
}

export async function sendAccessUpdateEmail(params: {
  to: string;
  name: string;
  firmName: string;
  allowedPages: string[] | null;
  updateLink: string;
}): Promise<boolean> {
  const client = getResendClient();
  const pageLabels: Record<string, string> = {
    dashboard: 'Dashboard', cases: 'Cases', clients: 'Clients', reminders: 'Deadlines & Reminders',
    updates: 'Client Updates', documents: 'Documents', chat: 'Team Chat', settings: 'Settings'
  };
  const pagesText = params.allowedPages?.length ? params.allowedPages.map(p => pageLabels[p] || p).join(', ') : 'Full firm access';

  if (!client) {
    console.log(`\n[EMAIL SKIPPED]\nTo: ${params.to}\nNew access: ${pagesText}\nLink: ${params.updateLink}\n`);
    return false;
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Your access on ${params.firmName} has been updated`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
            <h1 style="color:#38bdf8;margin:0;font-size:18px;letter-spacing:2px;">DOCKET</h1>
          </div>
          <h2 style="color:#0f172a;font-size:20px;">Hello ${params.name},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">An administrator at <strong>${params.firmName}</strong> wants to update your page access to: <strong>${pagesText}</strong>.</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">Click below to confirm and apply this change.</p>
          <a href="${params.updateLink}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:16px 0;">CONFIRM ACCESS UPDATE</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">This link expires in 48 hours.</p>
        </div>
      `
    });
    if (result.error) { console.error('[Email] ❌ Resend rejected access update:', JSON.stringify(result.error)); return false; }
    console.log(`[Email] ✅ Access update sent to ${params.to}`);
    return true;
  } catch (err: any) {
    console.error('[Email] ❌ FAILED access update email:', err?.message || err);
    return false;
  }
}

export async function sendSignatureOTPEmail(params: {
  to: string;
  signatoryName: string;
  documentTitle: string;
  otp: string;
}): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.log(`\n[OTP EMAIL SKIPPED]\nTo: ${params.to}\nOTP Code: ${params.otp}\n`);
    return false;
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `Your Secure Signing Code for "${params.documentTitle}"`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
            <h1 style="color:#38bdf8;margin:0;font-size:18px;letter-spacing:2px;">DOCKET SIGN</h1>
          </div>
          <h2 style="color:#0f172a;font-size:20px;">Hello ${params.signatoryName},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">You have been requested to sign the following document: <strong>${params.documentTitle}</strong>.</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">Your secure, one-time signing verification code is:</p>
          <div style="background:#f1f5f9;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:4px;color:#0f172a;margin:16px 0;">
            ${params.otp}
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">This OTP verification code is short-lived and will expire in 10 minutes.</p>
        </div>
      `
    });
    if (result.error) { console.error('[Email] ❌ Resend rejected signature OTP:', JSON.stringify(result.error)); return false; }
    console.log(`[Email] ✅ Signature OTP email sent to ${params.to}`);
    return true;
  } catch (err: any) {
    console.error('[Email] ❌ FAILED signature OTP email:', err?.message || err);
    return false;
  }
}

export async function sendTaskAssignmentEmail(params: {
  to: string;
  name: string;
  assignerName: string;
  firmName: string;
  taskTitle: string;
  taskDescription: string;
}): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.log(`\n[EMAIL SKIPPED]\nTo: ${params.to}\nTask: ${params.taskTitle}\nDesc: ${params.taskDescription}\n`);
    return false;
  }
  try {
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      replyTo: REPLY_TO,
      subject: `🚨 New Task Assigned: "${params.taskTitle}" on Docket`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
            <h1 style="color:#38bdf8;margin:0;font-size:18px;letter-spacing:2px;">DOCKET</h1>
          </div>
          <h2 style="color:#0f172a;font-size:20px;">Hello ${params.name},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">
            <strong>${params.assignerName}</strong> has assigned you a new task in <strong>${params.firmName}</strong>.
          </p>
          <div style="background:#ffffff;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin:16px 0;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h3 style="margin-top:0;color:#0f172a;font-size:16px;font-weight:bold;">${params.taskTitle}</h3>
            <p style="color:#475569;font-size:13px;line-height:1.5;margin-bottom:0;white-space:pre-wrap;">${params.taskDescription || 'No description provided.'}</p>
          </div>
          <p style="color:#475569;font-size:13px;line-height:1.6;">
            Please log in to your Docket workspace to review details and track your progress.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
            Do not reply to this system notification.
          </p>
        </div>
      `
    });
    if (result.error) {
      console.error('[Email] ❌ Resend rejected task email:', JSON.stringify(result.error));
      return false;
    }
    console.log(`[Email] ✅ Task assignment email sent to ${params.to}`);
    return true;
  } catch (err: any) {
    console.error('[Email] ❌ FAILED task assignment email:', err?.message || err);
    return false;
  }
}

