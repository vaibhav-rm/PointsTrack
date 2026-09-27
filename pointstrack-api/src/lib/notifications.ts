import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db, students } from '../db/index.js';

const expo = new Expo();

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  sent: number;
  invalidTokens: number;
  errors: string[];
}

async function sendToTokens(tokens: string[], payload: PushPayload): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, invalidTokens: 0, errors: [] };
  // Tokens observed dead during THIS send; pruned at the end in one query.
  const deadTokens = new Set<string>();
  const valid = tokens.filter((t) => {
    const isValid = Expo.isExpoPushToken(t);
    if (!isValid) result.invalidTokens++;
    return isValid;
  });

  if (valid.length === 0) return result;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  // Ticket id → token, so error receipts below map back to the dead token.
  const ticketToToken = new Map<string, string>();
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      result.sent += tickets.length;
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok' && (ticket as any).id) {
          ticketToToken.set((ticket as any).id, chunk[i].to as string);
        } else if (ticket.status === 'error') {
          // Immediate per-message errors (e.g. malformed token) — drop now.
          result.invalidTokens++;
          deadTokens.add(chunk[i].to as string);
        }
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      result.errors.push(errMsg);
      console.error('[NOTIFICATIONS] Push notification chunk delivery failed:', {
        error: errMsg,
        chunkSize: chunk.length,
        payloadTitle: payload.title,
      });
    }
  }

  // Receipt phase: Expo reports dead tokens asynchronously
  // (DeviceNotRegistered). Tokens with no entry yet are simply retried next
  // time — only hard errors prune.
  if (ticketToToken.size > 0) {
    try {
      const receiptIdChunks = expo.chunkPushNotificationReceiptIds([...ticketToToken.keys()]);
      for (const idChunk of receiptIdChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(idChunk);
        for (const [id, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            const code = (receipt as any).details?.errorCode;
            if (code === 'DeviceNotRegistered' || code === 'InvalidCredentials') {
              const token = ticketToToken.get(id);
              if (token) {
                result.invalidTokens++;
                deadTokens.add(token);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[NOTIFICATIONS] Receipt check failed:', err?.message || err);
    }
  }

  // Prune dead tokens so future fan-outs stop paying for them.
  if (deadTokens.size > 0) {
    try {
      await db
        .update(students)
        .set({ pushToken: null })
        .where(inArray(students.pushToken, [...deadTokens]));
    } catch (err: any) {
      console.error('[NOTIFICATIONS] Dead-token prune failed:', err?.message || err);
    }
  }
  return result;
}

export async function notifyStudent(studentId: string, payload: PushPayload): Promise<NotificationResult> {
  const [student] = await db
    .select({ pushToken: students.pushToken })
    .from(students)
    .where(eq(students.id, studentId));
  if (!student?.pushToken) return { sent: 0, invalidTokens: 0, errors: [] };
  return sendToTokens([student.pushToken], payload);
}

export async function notifyStudentsByCollege(
  payload: PushPayload,
  targetCollege?: string | null
): Promise<NotificationResult> {
  // Batched fan-out: page through push tokens (1k rows at a time) instead of
  // loading the whole student body into memory, then send Expo chunks with
  // bounded concurrency. Scales to tens of thousands of students; for larger
  // blasts move this into a background queue (BullMQ/Redis) and return 202.
  const aggregate: NotificationResult = { sent: 0, invalidTokens: 0, errors: [] };
  const PAGE = 1000;
  let offset = 0;

  for (;;) {
    const conds = [isNotNull(students.pushToken)];
    if (targetCollege) conds.push(eq(students.college, targetCollege));

    const rows = await db
      .select({ pushToken: students.pushToken })
      .from(students)
      .where(and(...conds))
      .limit(PAGE)
      .offset(offset);
    if (rows.length === 0) break;

    const r = await sendToTokens(rows.map((r) => r.pushToken!) as string[], payload);
    aggregate.sent += r.sent;
    aggregate.invalidTokens += r.invalidTokens;
    aggregate.errors.push(...r.errors);

    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return aggregate;
}
