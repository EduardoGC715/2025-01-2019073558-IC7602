import { database } from "../../src/firebase";

// Vercel Cron Schedule — runs daily at midnight UTC
export const config = {
  schedule: "*/5 * * * *", // adjust as needed (crontab.guru)
};

export default async function handler(req: Request, res: Response) {
  try {
    const result = await cleanExpiredSessions();
    res.status(200).json({
      message: `Cleanup complete. Deleted ${result.deletedCount} expired sessions.`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Error during session cleanup",
      error: error.message,
    });
  }
}

export async function cleanExpiredSessions(
  expirationThresholdMs = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<{
  deletedCount: number;
  errors: string[];
}> {
  const result = {
    deletedCount: 0,
    errors: [] as string[],
  };

  try {
    const sessionsRef = database.ref("sessions");
    const now = Date.now();
    const snapshot = await sessionsRef.once("value");
    const sessions = snapshot.val();

    if (!sessions) {
      console.log("No sessions found in database");
      return result;
    }

    const updates: Record<string, null> = {};

    Object.entries(sessions).forEach(
      ([sessionId, sessionData]: [string, any]) => {
        try {
          const timestamp = sessionData.lastActive || sessionData.createdAt;
          if (timestamp && now - timestamp > expirationThresholdMs) {
            updates[`sessions/${sessionId}`] = null;
            result.deletedCount++;
            console.log(`Deleted expired session: ${sessionId}`);
          }
        } catch (err) {
          const msg = `Error processing session ${sessionId}: ${
            (err as Error).message
          }`;
          result.errors.push(msg);
          console.error(msg);
        }
      }
    );

    await database.ref().update(updates);
    console.log(
      `Session cleanup complete. Deleted ${result.deletedCount} sessions.`
    );

    return result;
  } catch (err) {
    console.error("Error in cleanExpiredSessions:", err);
    throw err;
  }
}
