import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db, students } from '../db/index.js';

const expo = new Expo();

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendToTokens(tokens: string[], payload: PushPayload) {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return [];

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  for (const chunk of chunks) {
    try {
      tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
    } catch (err) {
      console.error('Push chunk failed:', err);
    }
  }
  return tickets;
}

// Notify a single student by id.
export async function notifyStudent(studentId: string, payload: PushPayload) {
  const [student] = await db
    .select({ pushToken: students.pushToken })
    .from(students)
    .where(eq(students.id, studentId));
  if (!student?.pushToken) return [];
  return sendToTokens([student.pushToken], payload);
}

// Notify all eligible students. When targetCollege is set, only that college;
// otherwise everyone (open-to-all event). The filtering happens in SQL — and
// we only pull rows that actually have a push token — so a broadcast never loads
// the entire students table into memory.
export async function notifyStudentsByCollege(
  payload: PushPayload,
  targetCollege?: string | null
) {
  const conds = [isNotNull(students.pushToken)];
  if (targetCollege) conds.push(eq(students.college, targetCollege));

  const rows = await db
    .select({ pushToken: students.pushToken })
    .from(students)
    .where(and(...conds));

  return sendToTokens(rows.map((r) => r.pushToken!) as string[], payload);
}
