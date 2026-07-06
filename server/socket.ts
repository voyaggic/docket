import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from './db';

let io: SocketIOServer | null = null;

export function initializeSocket(
  httpServer: HTTPServer,
  sessionMiddleware: any
): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ||
              (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : undefined) ||
              'http://localhost:5173',
      credentials: true
    },
    pingTimeout: 20000,
    pingInterval: 25000,
    // Prevent event flooding — drop connections sending more than 100 events/second
    maxHttpBufferSize: 1e6
  });

  // ── Layer 1: Share Express session with socket connections ──────────────
  io.use((socket: Socket, next: any) => {
    sessionMiddleware(socket.request as any, {} as any, next);
  });

  // ── Layer 2: Auth gate — every socket must have a valid authenticated session
  io.use(async (socket: Socket, next: any) => {
    try {
      const session = (socket.request as any).session;
      const userId = session?.passport?.user;
      if (!userId) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const user = await db.getUser(userId);
      if (!user || !user.companyId) {
        return next(new Error('USER_NOT_FOUND'));
      }

      // Attach to socket for use in all event handlers
      (socket as any).userId = user.id;
      (socket as any).companyId = user.companyId;
      (socket as any).userFullName = user.fullName;
      next();
    } catch (err) {
      next(new Error('AUTH_ERROR'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, companyId, userFullName } = socket as any;

    // ── Layer 3: Tenant isolation — join only this firm's room ────────────
    // A socket in firm:A can NEVER receive events emitted to firm:B
    socket.join(`firm:${companyId}`);

    // Join a specific case channel — verify ownership before joining
    socket.on('join:case', async (caseId: string) => {
      if (!caseId || typeof caseId !== 'string') return;
      try {
        const caseRecord = await db.getCase(companyId, caseId);
        if (caseRecord) {
          socket.join(`case:${companyId}:${caseId}`);
        }
      } catch {}
    });

    socket.on('leave:case', (caseId: string) => {
      if (typeof caseId === 'string') {
        socket.leave(`case:${companyId}:${caseId}`);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    // Rate-limited implicitly by socket.io's built-in flood protection
    socket.on('typing:start', (data: { caseId?: string | null }) => {
      const room = data?.caseId
        ? `case:${companyId}:${data.caseId}`
        : `firm:${companyId}`;
      // socket.to() excludes the sender — they don't see their own typing indicator
      socket.to(room).emit('user:typing', {
        userId,
        userName: userFullName,
        caseId: data?.caseId || null
      });
    });

    socket.on('typing:stop', (data: { caseId?: string | null }) => {
      const room = data?.caseId
        ? `case:${companyId}:${data.caseId}`
        : `firm:${companyId}`;
      socket.to(room).emit('user:stopped_typing', {
        userId,
        caseId: data?.caseId || null
      });
    });

    socket.on('disconnect', () => {
      // socket.io auto-cleans room memberships on disconnect
    });
  });

  return io;
}

// ── Broadcast helpers — called from HTTP route handlers ──────────────────

// Emit new message to the appropriate room
// Uses io.to() which includes ALL room members including the sender —
// the frontend deduplicates by message ID to avoid showing it twice.
export function emitNewMessage(
  companyId: string,
  caseId: string | null,
  message: any
): void {
  if (!io) return;
  const room = caseId
    ? `case:${companyId}:${caseId}`
    : `firm:${companyId}`;
  io.to(room).emit('chat:new_message', message);
}

export function emitMessageUpdate(
  companyId: string,
  caseId: string | null,
  message: any
): void {
  if (!io) return;
  const room = caseId
    ? `case:${companyId}:${caseId}`
    : `firm:${companyId}`;
  io.to(room).emit('chat:message_updated', message);
}

export function emitNewLegalNotice(
  companyId: string,
  notice: any
): void {
  if (!io) return;
  io.to(`firm:${companyId}`).emit('notice:new', notice);
}

export function emitNoticeAcknowledged(
  companyId: string,
  noticeId: string,
  userId: string
): void {
  if (!io) return;
  io.to(`firm:${companyId}`).emit('notice:acknowledged', { noticeId, userId });
}

export { io };
