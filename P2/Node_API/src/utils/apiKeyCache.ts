import { database } from "../firebase";

export const apiKeyCache = new Map<string, string>();

export function initializeApiKeyListener() {
  const apiKeyRef = database.ref("apiKeys");
  console.log("Listening for API keys updates...");
  apiKeyRef.on("value", (snapshot) => {
    if (snapshot.exists()) {
      console.log("API keys updated");
      console.log(snapshot.val());
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
