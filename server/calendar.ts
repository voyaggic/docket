import { google } from 'googleapis';
import { db } from './db';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );
}

export function getCalendarAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: userId, // pass userId through so we know who to save tokens for
  });
}

export async function exchangeCodeForTokens(code: string, userId: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned. User may need to revoke access and reconnect.');
  }

  db.saveUserCalendarTokens(userId, {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : '',
    connectedAt: new Date().toISOString(),
  });
}

async function getAuthorizedClient(userId: string) {
  const tokens = db.getUserCalendarTokens(userId);
  if (!tokens) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : undefined,
  });

  // Auto-refresh if expired
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.access_token) {
      db.saveUserCalendarTokens(userId, {
        ...tokens,
        accessToken: newTokens.access_token,
        expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : tokens.expiresAt,
      });
    }
  });

  return oauth2Client;
}

export async function createCalendarEvent(
  userId: string,
  deadline: { id: string; title: string; dueDate: string; deadlineType?: string; companyId: string },
  context: { caseName?: string; clientName?: string; firmName?: string }
): Promise<string | null> {
  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: 'v3', auth });
    const dueDate = new Date(deadline.dueDate);
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[Docket] ${deadline.title}`,
        description: [
          context.caseName ? `Case: ${context.caseName}` : '',
          context.clientName ? `Client: ${context.clientName}` : '',
          context.firmName ? `Firm: ${context.firmName}` : '',
          deadline.deadlineType ? `Type: ${deadline.deadlineType}` : '',
        ].filter(Boolean).join('\n'),
        start: { dateTime: dueDate.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endDate.toISOString(), timeZone: 'UTC' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 },   // 1 day before
            { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
            { method: 'email', minutes: 7 * 24 * 60 }, // 7 days before
          ],
        },
        colorId: '11', // red — urgent legal color
      },
    });

    return event.data.id || null;
  } catch (err) {
    console.error('[Calendar] createCalendarEvent failed:', err);
    return null;
  }
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  deadline: { title: string; dueDate: string; deadlineType?: string },
  context: { caseName?: string; clientName?: string; firmName?: string }
): Promise<void> {
  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: 'v3', auth });
    const dueDate = new Date(deadline.dueDate);
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: `[Docket] ${deadline.title}`,
        description: [
          context.caseName ? `Case: ${context.caseName}` : '',
          context.clientName ? `Client: ${context.clientName}` : '',
          deadline.deadlineType ? `Type: ${deadline.deadlineType}` : '',
        ].filter(Boolean).join('\n'),
        start: { dateTime: dueDate.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endDate.toISOString(), timeZone: 'UTC' },
      },
    });
  } catch (err) {
    console.error('[Calendar] updateCalendarEvent failed:', err);
  }
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  try {
    const auth = await getAuthorizedClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (err) {
    console.error('[Calendar] deleteCalendarEvent failed:', err);
  }
}
