import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Sends push notification to a list of Expo push tokens via FCM HTTP v1.
async function sendPush(tokens: string[], title: string, body: string) {
  const validTokens = tokens.filter(Boolean);
  if (validTokens.length === 0) return;

  await Promise.allSettled(
    validTokens.map((token) =>
      messaging.send({
        token,
        notification: { title, body },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      })
    )
  );
}

async function getTokensForUids(uids: string[]): Promise<string[]> {
  if (uids.length === 0) return [];
  const docs = await Promise.all(uids.map((uid) => db.doc(`users/${uid}`).get()));
  return docs.map((d) => d.data()?.fcmToken).filter(Boolean);
}

// Runs every hour and notifies members about overdue todos.
export const checkOverdueTodos = onSchedule('every 60 minutes', async () => {
  const now = admin.firestore.Timestamp.now();

  const snap = await db
    .collection('todos')
    .where('status', '==', 'pending')
    .where('dueDate', '<=', now)
    .where('notifyOnOverdue', '!=', [])
    .get();

  for (const doc of snap.docs) {
    const todo = doc.data();
    const tokens = await getTokensForUids(todo.notifyOnOverdue);
    await sendPush(tokens, 'To-Do overdue', `"${todo.title}" is overdue.`);
  }
});

// When a household is deleted, remove it from all members' user documents.
export const onHouseholdDeleted = onDocumentDeleted('households/{householdId}', async (event) => {
  const household = event.data?.data();
  if (!household) return;

  const memberUids = Object.keys(household.members ?? {});
  if (memberUids.length === 0) return;

  await Promise.allSettled(
    memberUids.map(async (uid) => {
      const userRef = db.doc(`users/${uid}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return;

      const userData = userSnap.data()!;
      const remainingIds: string[] = (userData.householdIds ?? []).filter(
        (id: string) => id !== event.params.householdId
      );
      const nextActive =
        userData.activeHouseholdId === event.params.householdId
          ? (remainingIds[0] ?? null)
          : userData.activeHouseholdId;

      await userRef.update({
        householdIds: admin.firestore.FieldValue.arrayRemove(event.params.householdId),
        activeHouseholdId: nextActive,
      });
    })
  );
});

// Triggers when a todo is marked as completed and notifies the right members.
export const onTodoCompleted = onDocumentUpdated('todos/{todoId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === 'completed' || after.status !== 'completed') return;

  const tokens = await getTokensForUids(after.notifyOnComplete);
  await sendPush(tokens, 'To-Do completed ✓', `"${after.title}" has been marked as done.`);
});
