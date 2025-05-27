import { NextFunction, Request, Response } from "express";
import { database, firestore } from "../firebase";
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

  console.time("get apiKeyEdgeConfig");
  const apiKeyEdgeConfig = await get<string>(appId);
  console.timeEnd("get apiKeyEdgeConfig");

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
  console.log("token", token);
  if (!token) {
    console.error("No token provided");
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
        console.error("JWT verification error:", err);
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { sessionId, domain, type } = session as JwtPayload;
      console.log("sessionId, domain, type", sessionId, domain, type);
      const sessionRef = firestore.collection("sessions").doc(sessionId);
      const snapshot = await sessionRef.get();
      if (!snapshot.exists) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const sessionData = snapshot.data();
      if (!sessionData) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const now = new Date(Date.now());
      const expiresAt = new Date(sessionData.expiresAt);
      if (now > expiresAt) {
        sessionRef.delete();
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      if (domain !== sessionData.domain) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      console.log("type", type);
      if (type == "user") {
        const { user } = session as JwtPayload;
        if (!user || !domain || !sessionId) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
        if (user !== sessionData.user) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
      } else {
        const { apiKey } = session as JwtPayload;
        if (!apiKey || sessionData.apiKey !== apiKey) {
          res.status(401).json({ message: "Unauthorized" });
          return;
        }
      }

      req.session = session;
      next();
    }
  );
};

/* Referencias
Basado en: https://apidog.com/blog/node-js-express-authentication/
*/
