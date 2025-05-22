import { Request, Response } from "express";
import { firestore, database } from "../firebase";
import ms from "ms";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { jwtDecode } from "jwt-decode";

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
    const sessionsRef = await firestore.collection("sessions").add(sessionData);
    const sessionId = sessionsRef.id;
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
    const { username, password } = req.body;
    const docRef = firestore.collection("users").doc(username);
    const doc = await docRef.get();
    if (doc.exists) {
      res.status(400).json({ message: "El usuario ya existe." });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    await docRef.set({
      username,
      password: hashedPassword,
    });

    const expiration = "1h";
    const token = await createSession(username, "domain_ui", expiration);
    if (!token) {
      res.status(500).json({ message: "Error creating session" });
      return;
    }
    res.cookie("token", token, {
      maxAge: ms(expiration),
      sameSite: "none",
      secure: true,
    });
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const docRef = firestore.collection("users").doc(username);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userData = doc.data();
    if (!userData) {
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    const isPasswordValid = bcrypt.compareSync(password, userData.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const expiration = "1h";
    const token = await createSession(username, "domain_ui", expiration);
    if (!token) {
      res.status(500).json({ message: "Failed to create session" });
      return;
    }
    res.cookie("token", token, {
      maxAge: ms(expiration),
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.cookies.token;
  if (!token) {
    console.error("No token found");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const decoded: any = jwtDecode(token);
  const { sessionId } = decoded;
  const sessionRef = firestore.collection("sessions").doc(sessionId);
  await sessionRef.delete();

  res.clearCookie("token", {
    sameSite: "none",
    secure: true,
  });
  res.status(200).json({ message: "Session removed" });
};

/* Referencias:
https://firebase.google.com/docs/database/admin/save-data
https://www.npmjs.com/package/ms
https://github.com/auth0/node-jsonwebtoken
https://www.npmjs.com/package/bcryptjs
https://apidog.com/blog/node-js-express-authentication/
https://www.npmjs.com/package/jwt-decode#getting-started
*/
