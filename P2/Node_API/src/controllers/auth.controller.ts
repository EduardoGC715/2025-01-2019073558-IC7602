import { Request, Response } from "express";
import { firestore, database } from "../firebase";
import ms from "ms";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { jwtDecode } from "jwt-decode";

const createSessionUser = async (
  user: string,
  domain: string,
  expiration: ms.StringValue
) => {
  try {
    const expirationMs = ms(expiration);
    if (isNaN(expirationMs)) {
      return "";
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
      return "";
    }
    const token = jwt.sign(
      { user, domain, sessionId, type: "user" },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: expiration }
    );

    return token;
  } catch (error) {
    console.error("Error creating session:", error);
    return "";
  }
};

const createSessionApiKey = async (
  apiKey: string,
  domain: string,
  expiration: ms.StringValue
) => {
  try {
    const expirationMs = ms(expiration);
    if (isNaN(expirationMs)) {
      return "";
    }

    const now = new Date(Date.now());
    const expirationDate = new Date(now.getTime() + expirationMs);
    const sessionData = {
      apiKey,
      domain,
      createdAt: now.toISOString(),
      expiresAt: expirationDate.toISOString(),
    };
    const sessionsRef = await firestore.collection("sessions").add(sessionData);
    const sessionId = sessionsRef.id;
    if (!sessionId) {
      return "";
    }
    const token = jwt.sign(
      { apiKey, domain, sessionId, type: "api-key" },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: expiration }
    );

    return token;
  } catch (error) {
    console.error("Error creating session:", error);
    return "";
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
    const token = await createSessionUser(username, "domain_ui", expiration);
    if (!token) {
      res.status(500).json({ message: "Error al crear la sesión" });
      return;
    }
    res.cookie("token", token, {
      maxAge: ms(expiration),
      sameSite: "none",
      secure: true,
    });
    res.status(201).json({ message: "Usuario registrado exitosamente", token });
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
    const token = await createSessionUser(username, "domain_ui", expiration);
    if (!token) {
      res.status(500).json({ message: "Error al crear sesión" });
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

export const loginSubdomainUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password, subdomain } = req.body;
    console.log(username, password, subdomain);
    let subdomainURL: URL;
    try {
      subdomainURL = new URL(subdomain);
    } catch (error) {
      console.error("Invalid subdomain URL:", error);
      res.status(400).json({ message: "URL del subdominio inválido" });
      return;
    }
    const docRef = firestore
      .collection("subdomains")
      .doc(subdomainURL.hostname);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(401).json({ message: "Unauthorized. No domain." });
      return;
    }

    const subdomainData = doc.data();
    if (!subdomainData) {
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    if (subdomainData.authMethod != "user-password") {
      res.status(401).json({
        message:
          "Unauthorized, subdominio requiere autenticación con usuario y contraseña",
      });
      return;
    }

    console.log("Subdomain data:", subdomainData);
    const userPassword = subdomainData.users?.[username];
    if (!userPassword) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const isPasswordValid = bcrypt.compareSync(password, userPassword);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const expiration = "1h";
    const token = await createSessionUser(username, subdomain, expiration);
    if (!token) {
      res.status(500).json({ message: "Error al crear sesión" });
      return;
    }
    // res.cookie("token", token, {
    //   maxAge: ms(expiration),
    //   sameSite: "none",
    //   secure: true,
    //   httpOnly: true,
    //   domain: subdomainData.domain,
    // });
    const redirectURL = new URL("/_auth/callback", subdomainURL.origin);
    redirectURL.searchParams.set("token", token);
    redirectURL.searchParams.set("next", subdomain);
    redirectURL.searchParams.set("exp", (ms(expiration) / 1000).toString());
    res.status(200).json({ url: redirectURL.toString() });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginSubdomainApiKey = async (req: Request, res: Response) => {
  try {
    const { apiKey, subdomain } = req.body;
    console.log(apiKey, subdomain);
    let subdomainURL: URL;
    try {
      subdomainURL = new URL(subdomain);
    } catch (error) {
      console.error("Invalid subdomain URL:", error);
      res.status(400).json({ message: "URL del subdominio inválido" });
      return;
    }
    const docRef = firestore
      .collection("subdomains")
      .doc(subdomainURL.hostname);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(401).json({ message: "Unauthorized. No domain." });
      return;
    }

    const subdomainData = doc.data();
    if (!subdomainData) {
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    if (subdomainData.authMethod != "api-keys") {
      res.status(401).json({
        message: "Unauthorized, subdominio requiere autenticación con api-keys",
      });
      return;
    }

    console.log("Subdomain data:", subdomainData);
    const apiKeys = subdomainData.apiKeys;
    if (!apiKeys || !apiKeys.hasOwnProperty(apiKey)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const expiration = "1h";
    const token = await createSessionApiKey(apiKey, subdomain, expiration);
    if (!token) {
      res.status(500).json({ message: "Error al crear sesión" });
      return;
    }
    // res.cookie("token", token, {
    //   maxAge: ms(expiration),
    //   sameSite: "none",
    //   secure: true,
    //   httpOnly: true,
    //   domain: subdomainData.domain,
    // });
    const redirectURL = new URL("/_auth/callback", subdomainURL.origin);
    redirectURL.searchParams.set("token", token);
    redirectURL.searchParams.set("next", subdomain);
    redirectURL.searchParams.set("exp", (ms(expiration) / 1000).toString());
    res.status(200).json({ url: redirectURL.toString() });
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

export const validateSubdomainSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = req.session;
  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.status(200).send("OK");
};

/* Referencias:
https://firebase.google.com/docs/database/admin/save-data
https://www.npmjs.com/package/ms
https://github.com/auth0/node-jsonwebtoken
https://www.npmjs.com/package/bcryptjs
https://apidog.com/blog/node-js-express-authentication/
https://www.npmjs.com/package/jwt-decode#getting-started
*/
