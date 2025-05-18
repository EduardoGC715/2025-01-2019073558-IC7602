import { database } from "#/firebase";

export const apiKeyCache = new Map<string, string>();

export function initializeApiKeyListener() {
  const apiKeyRef = database.ref("apiKeys");

  apiKeyRef.on("value", (snapshot) => {
    if (snapshot.exists()) {
      const apiKeys = snapshot.val();
      for (const [key, value] of Object.entries(apiKeys)) {
        apiKeyCache.set(key, value as string);
      }
    }
  });
}

/* Referencias
https://firebase.google.com/docs/database/admin/retrieve-data
*/
