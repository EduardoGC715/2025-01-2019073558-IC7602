import { NextFunction, Request, Response } from "express";
import { database } from "../firebase";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../../types/auth";
import { jwtDecode } from "jwt-decode";
import { get } from "@vercel/edge-config";

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

  const apiKeyEdgeConfig = await get<string>(appId);
  if (!apiKeyEdgeConfig) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const isValid = apiKeyEdgeConfig === apiKey;

  if (!isValid) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  next();
};

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  // const session = jwtDecode(token) as JwtPayload;
  // req.session = session;
  // next();
  jwt.verify(
    token,
    process.env.JWT_SECRET || "defaultsecret",
    async (err: any, session: any) => {
      if (err) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { user, domain, sessionId } = session as JwtPayload;
      if (!user || !domain || !sessionId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      // const snapshot = await database
      //   .ref(`sessions/${sessionId}`)
      //   .once("value");
      // if (!snapshot.exists()) {
      //   res.status(401).json({ message: "Unauthorized" });
      //   return;
      // }
      // const sessionData = snapshot.val();
      // const now = new Date(Date.now());
      // const expiresAt = new Date(sessionData.expiresAt);
      // if (now > expiresAt) {
      //   database.ref(`sessions/${sessionId}`).remove();
      //   res.status(401).json({ message: "Unauthorized" });
      //   return;
      // }
      // if (domain !== sessionData.domain) {
      //   res.status(401).json({ message: "Unauthorized" });
      //   return;
      // }
      // if (user !== sessionData.user) {
      //   res.status(401).json({ message: "Unauthorized" });
      //   return;
      // }
      req.session = session;
      next();
    }
  );
};

/* Referencias
Basado en: https://apidog.com/blog/node-js-express-authentication/
*/
