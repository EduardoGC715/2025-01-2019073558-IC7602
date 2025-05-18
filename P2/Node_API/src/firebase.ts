import admin, { ServiceAccount } from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccountJson from "#/serviceAccount.json";

const serviceAccount = serviceAccountJson as ServiceAccount;

// Initialize Firebase
const app = initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://dnsfire-8c6fd-default-rtdb.firebaseio.com",
});

export const database = getDatabase(app);

export const firestore = getFirestore(app);
