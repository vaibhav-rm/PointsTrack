import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { and, eq, isNotNull } from 'drizzle-orm';
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

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      result.sent += tickets.length;
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
  const conds = [isNotNull(students.pushToken)];
  if (targetCollege) conds.push(eq(students.college, targetCollege));

  const rows = await db
    .select({ pushToken: students.pushToken })
    .from(students)
    .where(and(...conds));

  return sendToTokens(rows.map((r) => r.pushToken!) as string[], payload);
}
