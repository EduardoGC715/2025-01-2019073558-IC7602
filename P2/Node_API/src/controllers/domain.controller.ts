import { Request, Response } from "express";
import { database, firestore } from "../firebase";
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
    const { domain } = req.body as any;
    if (!domain) {
      res.status(400).json({ message: "Dominio requerido" });
      return;
    }
    if (!validator.isFQDN(domain)) {
      res.status(400).json({ message: "Dominio inválido" });
      return;
    }
    const { session } = req;
    const flipped_domain = domain.trim().split(".").reverse().join("/");
    const domainRef = database.ref(`domains/${flipped_domain}`);
    const domainSnapshot = await domainRef.once("value");
    if (domainSnapshot.exists()) {
      res.status(400).json({ message: "El dominio ya está registrado" });
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
      user: session.user,
      createdAt: new Date().toISOString(),
      validation,
      validated: false,
    };
    const updates: Record<string, any> = {};
    updates[`domains/${flipped_domain}/_data`] = domainData;

    await database.ref().update(updates);

    const userDocRef = firestore.collection("users").doc(session.user);
    await userDocRef.set(
      {
        domains: { [domain]: domainData },
      },
      { merge: true }
    );

    res.status(201).json({
      message: "Domain registered successfully",
      validation,
    });
  } catch (error) {
    console.error("Error registering domain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserDomains = async (req: Request, res: Response) => {
  try {
    const { session } = req;

    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userDocRef = firestore.collection("users").doc(session.user);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }
    const userData = userDoc.data();
    const domains = userData?.domains || {};

    res.status(200).json({ domains });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
