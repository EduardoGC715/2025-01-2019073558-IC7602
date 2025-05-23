import { Request, Response } from "express";
import { firestore, database } from "../firebase";
import { WriteBatch } from "firebase-admin/firestore";
import validator from "validator";
import ms from "ms";

export const getAllSubdomains = async (req: Request, res: Response) => {
  try {
    const subdomainsRef = firestore.collection("subdomains");
    const subdomains = subdomainsRef.get();

    res.status(200).json({ subdomains });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const registerSubdomain = async (req: Request, res: Response) => {
  try {
    const session = req.session;
    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      subdomain,
      domain,
      cacheSize,
      fileTypes,
      ttl,
      replacementPolicy,
      authMethod,
      apiKeys,
      users,
    } = req.body;

    if (typeof subdomain !== "string" || !domain) {
      res
        .status(400)
        .json({ message: "El subdominio y el dominio son requeridos" });
      return;
    }

    if (
      subdomain !== "" &&
      !validator.isFQDN(subdomain, { require_tld: false })
    ) {
      res.status(400).json({ message: "Subdominio inválido" });
      return;
    }

    const fullDomain = subdomain + "." + domain;
    if (!validator.isFQDN(fullDomain)) {
      res.status(400).json({ message: "Dominio inválido" });
      return;
    }

    // Validar que cacheSize sea un número
    if (typeof cacheSize !== "number" || isNaN(cacheSize)) {
      res
        .status(400)
        .json({ message: "El tamaño de caché debe ser un número válido" });
      return;
    }

    // Validar que ttl sea compatible con ms
    try {
      const ttlMs = ms(ttl);
      if (typeof ttlMs !== "number" || ttlMs <= 0) {
        throw new Error();
      }
    } catch {
      res.status(400).json({
        message:
          'El Time to Live debe ser una duración válida (por ejemplo, "5m", "1h")',
      });
      return;
    }

    // Validar que replacementPolicy sea uno de los valores permitidos
    const allowedPolicies = ["LRU", "LFU", "FIFO", "MRU", "Random"];
    if (!allowedPolicies.includes(replacementPolicy)) {
      res.status(400).json({
        message: `La política de reemplazo debe ser uno de los siguientes: ${allowedPolicies.join(
          ", "
        )}`,
      });
      return;
    }

    // Validar lógica de authMethod
    if (authMethod === "api-keys") {
      if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
        res.status(400).json({
          message:
            'Debe proporcionar llaves de autenticación cuando el método de autenticación sea por API keys"',
        });
        return;
      }
      if (Array.isArray(users) && users.length > 0) {
        res.status(400).json({
          message:
            "La lista de usuarios debe estar vacía cuando el método de autenticación es por API keys",
        });
        return;
      }
    } else if (authMethod === "user-password") {
      if (!Array.isArray(users) || users.length === 0) {
        res.status(400).json({
          message:
            'Debe proporcionar usuarios cuando el método de autenticación sea por usuario y password"',
        });
        return;
      }
      if (Array.isArray(apiKeys) && apiKeys.length > 0) {
        res.status(400).json({
          message:
            "La lista de API keys debe estar vacía cuando el método de autenticación sea por usuario y password",
        });
        return;
      }
    } else if (!authMethod || authMethod === "none") {
      if (
        (Array.isArray(apiKeys) && apiKeys.length > 0) ||
        (Array.isArray(users) && users.length > 0)
      ) {
        res.status(400).json({
          message:
            "La lista de API keys y usuarios deben estar vacías cuando no se especifique el método de autenticación",
        });
        return;
      }
    } else {
      res.status(400).json({
        message:
          'El método de autenticación debe ser "api-keys", "user-password" o "none"',
      });
      return;
    }

    const flipped_domain = fullDomain.trim().split(".").reverse().join("/");
    const fullDomainRef = database.ref(`domains/${flipped_domain}`);
    const domainSnapshot = await fullDomainRef.once("value");
    if (domainSnapshot.exists()) {
      res.status(400).json({ message: "El subdominio ya está registrado" });
      return;
    }

    const subdomainRef = firestore
      .collection("subdomains")
      .doc(subdomain + "." + domain);
    const domainRef = firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .doc(domain)
      .collection("subdomains")
      .doc(subdomain);
    const batch: WriteBatch = firestore.batch();

    const subdomainData = {
      cacheSize,
      fileTypes,
      ttl,
      replacementPolicy,
      authMethod,
      apiKeys,
      users,
    };
    batch.set(subdomainRef, subdomainData);
    batch.set(domainRef, { enabled: true });

    await batch.commit();

    const updates: Record<string, any> = {};
    updates[`domains/${flipped_domain}/_enabled`] = true;

    await database.ref().update(updates);

    res.status(201).json({ message: "Subdomain añadido exitosamente" });
  } catch (error) {
    console.error("Error adding subdomain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
