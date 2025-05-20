import { Request, Response } from "express";
import { database } from "../firebase";
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
  Config,
} from "unique-names-generator";
import { randomUUID } from "crypto";
import validator from "validator";

const customConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: "-",
  length: 2,
};

export const registerDomain = async (req: Request, res: Response) => {
  try {
    const { domain, ip } = req.body as any;
    if (!domain || !ip) {
      res.status(400).json({ message: "Domain and IP are required" });
      return;
    }
    if (!validator.isFQDN(domain)) {
      res.status(400).json({ message: "Invalid domain format" });
      return;
    }
    if (!validator.isIP(ip)) {
      res.status(400).json({ message: "Invalid IP format" });
      return;
    }
    const { session } = req;
    const flipped_domain = domain.trim().split(".").reverse().join("/");
    const domainRef = database.ref(`domains/${flipped_domain}`);
    const domainSnapshot = await domainRef.once("value");
    if (domainSnapshot.exists()) {
      res.status(400).json({ message: "Domain already registered" });
      return;
    }
    if (!session) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const subdomain = uniqueNamesGenerator(customConfig);
    const token = randomUUID();
    const validation = { subdomain, token };
    const domainData = {
      domain,
      ip,
      user: session.user,
      createdAt: new Date().toISOString(),
      validation,
    };
    const updates: Record<string, any> = {};
    updates[`domains/${flipped_domain}`] = domainData;
    updates[`userDomains/${session.user}/${flipped_domain}`] = true;

    await database.ref().update(updates);

    res.status(201).json({
      message: "Domain registered successfully",
      validation,
    });
  } catch (error) {
    console.error("Error registering domain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
