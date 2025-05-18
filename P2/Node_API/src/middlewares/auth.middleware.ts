import { NextFunction, Request, Response } from "express";
import { database } from "../firebase";
import jwt from "jsonwebtoken";

export const authenticateServer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers["x-api-key"];
  const appId = req.headers["x-app-id"];

  if (!apiKey || !appId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (typeof appId !== "string" || typeof apiKey !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const snapshot = await database.ref(`apiKeys/${appId}`).once("value");
  if (!snapshot.exists()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const apiKeyStored = snapshot.val();
  const isValid = apiKeyStored === apiKey;

  if (!isValid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  next();
};

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token || req.headers["x-access-token"];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  jwt.verify(
    token,
    process.env.JWT_SECRET || "defaultsecret",
    (err: any, user: any) => {
      if (err) {
        return res.status(401).json({ message: "Forbidden" });
      }
      req.user = user;
      next();
    }
  );
};

/* Referencias
Basado en: https://apidog.com/blog/node-js-express-authentication/
*/
