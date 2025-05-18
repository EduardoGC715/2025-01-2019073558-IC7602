import { Request, Response } from "express";
import { firestore, database } from "#/firebase";
import ms from "ms";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const createSession = async (
  user: string,
  domain: string,
  expiration: ms.StringValue
) => {
  try {
    const expirationMs = ms(expiration);
    if (isNaN(expirationMs)) {
      return { message: "Invalid expiration time" };
    }

    const now = new Date(Date.now());
    const expirationDate = new Date(now.getTime() + expirationMs);
    const sessionData = {
      user,
      domain,
      createdAt: now.toISOString(),
      expiresAt: expirationDate.toISOString(),
    };
    const sessionsRef = database.ref("sessions");
    const newSessionRef = await sessionsRef.push(sessionData);
    const sessionId = newSessionRef.key;
    if (!sessionId) {
      return { message: "Failed to create session" };
    }
    const token = jwt.sign(
      { user, domain, sessionId },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: expiration }
    );

    return token;
  } catch (error) {
    console.error("Error creating session:", error);
    return null;
  }
};

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user, password } = req.body;
    const docRef = firestore.collection("users").doc(user);
    const doc = await docRef.get();
    if (doc.exists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await docRef.set({
      user,
      password: hashedPassword,
    });

    const token = await createSession(user, "domain_ui", "1h");
    if (!token) {
      res.status(500).json({ message: "Failed to create session" });
      return;
    }
    res.status(201).json({ token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, password } = req.body;
    const docRef = firestore.collection("users").doc(user);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const userData = doc.data();
    if (!userData) {
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    const isPasswordValid = bcrypt.compareSync(password, userData.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const token = await createSession(user, "domain_ui", "1h");
    if (!token) {
      res.status(500).json({ message: "Failed to create session" });
      return;
    }
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* Referencias:
https://firebase.google.com/docs/database/admin/save-data
https://www.npmjs.com/package/ms
https://github.com/auth0/node-jsonwebtoken
https://www.npmjs.com/package/bcryptjs
https://apidog.com/blog/node-js-express-authentication/
*/
