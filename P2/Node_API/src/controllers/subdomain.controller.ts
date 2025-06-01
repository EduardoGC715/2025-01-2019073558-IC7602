import { Request, Response } from "express";
import { firestore, database } from "../firebase";
import { WriteBatch } from "firebase-admin/firestore";
import validator from "validator";
import ms, { StringValue } from "ms";
import bcrypt from "bcryptjs";
import { hashApiKey } from "./auth.controller";

export const getAllSubdomains = async (req: Request, res: Response) => {
  try {
    const subdomainsRef = firestore.collection("subdomains");
    const subdomainsSnapshot = await subdomainsRef.get();
    if (subdomainsSnapshot.empty) {
      res.status(200).json({ message: "No subdomains found" });
      return;
    }
    const subdomains: Record<string, any> = {};

    subdomainsSnapshot.forEach((doc) => {
      subdomains[doc.id] = doc.data();
    });

    res.status(200).json({ ...subdomains });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

interface registerSubdomainRequestBody {
  subdomain: string;
  domain: string;
  cacheSize: number;
  fileTypes: string[];
  ttl: StringValue; // Duration in ms format
  replacementPolicy: string; // e.g., "LRU", "LFU", etc.
  authMethod: string; // e.g., "api-keys", "user-password", "none"
  apiKeys?: Record<string, string>; // apiKey: true
  users?: Record<string, string>; // username: password
  https?: boolean; // Optional, true if HTTPS is enabled
  destination: string; // e.g., "https://example.com"
}

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
      https,
      destination,
    }: registerSubdomainRequestBody = req.body as registerSubdomainRequestBody;

    if (typeof subdomain !== "string" || !domain) {
      res
        .status(400)
        .json({ message: "El subdominio y el dominio son requeridos" });
      return;
    }

    const wildcardRe = /^(\*|\*\.[a-zA-Z0-9][a-zA-Z0-9-]*?)$/;
    if (
      subdomain !== "" &&
      !validator.isFQDN(subdomain, { require_tld: false }) &&
      !wildcardRe.test(subdomain)
    ) {
      res.status(400).json({ message: "Subdominio inválido" });
      return;
    }

    const fullDomain = subdomain + "." + domain;
    if (!validator.isFQDN(fullDomain) && !wildcardRe.test(subdomain)) {
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
    if (typeof ttl !== "number" || Number.isNaN(ttl) || ttl <= 0) {
      res.status(400).json({
        message: "El Time to Live debe ser un número de milisegundos positivo",
      });
      return;
    }

    if (typeof https !== "boolean") {
      res
        .status(400)
        .json({ message: "El campo useHttps debe ser true o false" });
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

    const hashedApiKeys: Record<string, string> = {};

    // Validar lógica de authMethod
    if (authMethod === "api-keys") {
      if (
        typeof apiKeys !== "object" ||
        apiKeys === null ||
        Array.isArray(apiKeys) ||
        Object.keys(apiKeys).length === 0
      ) {
        res.status(400).json({
          message:
            'Debe proporcionar llaves de autenticación cuando el método de autenticación sea por API keys"',
        });
        return;
      }
      if (
        typeof users === "object" &&
        users !== null &&
        !Array.isArray(users) &&
        Object.keys(users).length > 0
      ) {
        res.status(400).json({
          message:
            "La lista de usuarios debe estar vacía cuando el método de autenticación es por API keys",
        });
        return;
      }
      for (const [rawKey, nickname] of Object.entries(apiKeys)) {
        if (!rawKey || typeof nickname !== "string") {
          res.status(400).json({
            message:
              'Cada API Key debe tener una clave no vacía y un "nombre" válido',
          });
          return;
        }

        const hashedKey = hashApiKey(rawKey);
        hashedApiKeys[hashedKey] = nickname;
      }
    } else if (authMethod === "user-password") {
      if (
        typeof users !== "object" ||
        users === null ||
        Array.isArray(users) ||
        Object.keys(users).length === 0
      ) {
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
      for (const [username, password] of Object.entries(users)) {
        if (!username || typeof password !== "string") {
          res.status(400).json({
            message:
              'Cada usuario debe tener un "username" y un "password" válidos',
          });
          return;
        }

        const salt = bcrypt.genSaltSync(10);
        users[username] = bcrypt.hashSync(password, salt);
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
      apiKeys: authMethod === "api-keys" ? hashedApiKeys : {},
      users: authMethod === "user-password" ? users : {},
      https,
      destination,
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

export const getSubdomainsByDomain = async (req: Request, res: Response) => {
  try {
    const session = req.session;
    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const domain = req.query.domain as string;

    if (!domain) {
      res.status(400).json({ message: "Domain is required" });
      return;
    }

    const subdomainsSnapshot = await firestore.collection("subdomains").get();

    if (subdomainsSnapshot.empty) {
      res.status(200).json({ message: "No subdomains found" });
      return;
    }
    const subdomains: Record<string, any> = {};

    subdomainsSnapshot.forEach((doc) => {
      if (doc.id.endsWith(`.${domain}`)) {
        subdomains[doc.id] = doc.data();
      }
    });

    res.status(200).json(subdomains);
  } catch (error) {
    console.error("Error fetching subdomains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubdomain = async (req: Request, res: Response) => {
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
      https,
      destination,
    }: registerSubdomainRequestBody = req.body as registerSubdomainRequestBody;

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

    if (typeof cacheSize !== "number" || isNaN(cacheSize)) {
      res
        .status(400)
        .json({ message: "El tamaño de caché debe ser un número válido" });
      return;
    }

    if (typeof ttl !== "number" || Number.isNaN(ttl) || ttl <= 0) {
      res.status(400).json({
        message:
          "El Time to Live debe ser un número de milisegundos o una duración válida (ej. 5m, 1h)",
      });
      return;
    }

    if (typeof https !== "boolean") {
      res
        .status(400)
        .json({ message: "El campo useHttps debe ser true o false" });
      return;
    }

    const allowedPolicies = ["LRU", "LFU", "FIFO", "MRU", "Random"];
    if (!allowedPolicies.includes(replacementPolicy)) {
      res.status(400).json({
        message: `La política de reemplazo debe ser una de las siguientes: ${allowedPolicies.join(
          ", "
        )}`,
      });
      return;
    }

    if (authMethod === "api-keys") {
      if (
        typeof apiKeys !== "object" ||
        apiKeys === null ||
        Array.isArray(apiKeys) ||
        Object.keys(apiKeys).length === 0
      ) {
        res.status(400).json({
          message:
            "Debe proporcionar llaves de autenticación con el método API keys",
        });
        return;
      }
      if (Array.isArray(users) && users.length > 0) {
        res.status(400).json({
          message:
            "La lista de usuarios debe estar vacía cuando el método es API keys",
        });
        return;
      }
    } else if (authMethod === "user-password") {
      if (
        typeof users !== "object" ||
        users === null ||
        Array.isArray(users) ||
        Object.keys(users).length === 0
      ) {
        res.status(400).json({
          message: "Debe proporcionar usuarios con el método usuario/password",
        });
        return;
      }
      if (
        typeof apiKeys === "object" &&
        apiKeys !== null &&
        !Array.isArray(apiKeys) &&
        Object.keys(apiKeys).length > 0
      ) {
        res.status(400).json({
          message:
            "La lista de API keys debe estar vacía cuando el método es usuario/password",
        });
        return;
      }
    } else if (!authMethod || authMethod === "none") {
      if (
        (typeof apiKeys === "object" &&
          apiKeys !== null &&
          !Array.isArray(apiKeys) &&
          Object.keys(apiKeys).length > 0) ||
        (typeof users === "object" &&
          users !== null &&
          !Array.isArray(users) &&
          Object.keys(users).length > 0)
      ) {
        res.status(400).json({
          message:
            "Las listas de usuarios y API keys deben estar vacías si no se requiere autenticación",
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

    const usersMap = users as Record<string, string>;

    if (authMethod === "user-password") {
      for (const [username, password] of Object.entries(usersMap)) {
        if (!password.startsWith("$2")) {
          const salt = bcrypt.genSaltSync(10);
          usersMap[username] = bcrypt.hashSync(password, salt);
        }
      }
    }

    const apiKeysMap = apiKeys as Record<string, string>;
    let hashedApiKeys: Record<string, string> = {};
    if (authMethod === "api-keys") {
      for (const [rawKey, name] of Object.entries(apiKeysMap)) {
        const finalKey = rawKey.startsWith("$2")
          ? rawKey
          : bcrypt.hashSync(rawKey, bcrypt.genSaltSync(10));
        hashedApiKeys[finalKey] = name;
      }
    }

    const flippedDomain = fullDomain.trim().split(".").reverse().join("/");
    const subdomainRef = firestore.collection("subdomains").doc(fullDomain);
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
      apiKeys: authMethod === "api-keys" ? hashedApiKeys : {},
      users: authMethod === "user-password" ? usersMap : {},
      https,
      destination,
    };

    batch.update(subdomainRef, subdomainData);
    batch.update(domainRef, { enabled: true });

    await batch.commit();

    const updates: Record<string, any> = {};
    updates[`domains/${flippedDomain}/_enabled`] = true;

    await database.ref().update(updates);

    res.status(200).json({ message: "Subdominio actualizado exitosamente" });
  } catch (error) {
    console.error("Error updating subdomain:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const deleteSubdomain = async (req: Request, res: Response) => {
  try {
    const session = req.session;
    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { domain, subdomain } = req.params;

    if (!domain || !subdomain) {
      res.status(400).json({ message: "Domain and subdomain are required" });
      return;
    }

    const fullDomain = `${subdomain}.${domain}`;
    const flippedDomain = fullDomain.trim().split(".").reverse().join("/");

    const subdomainRef = firestore.collection("subdomains").doc(fullDomain);
    const domainRef = firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .doc(domain)
      .collection("subdomains")
      .doc(subdomain);

    const batch = firestore.batch();

    batch.delete(subdomainRef);
    batch.delete(domainRef);

    await batch.commit();

    await database.ref(`domains/${flippedDomain}`).remove();

    res.status(200).json({ message: "Subdominio eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting subdomain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSubdomainByName = async (req: Request, res: Response) => {
  try {
    const session = req.session;
    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { domain, subdomainName } = req.params;

    if (!domain || !subdomainName) {
      res.status(400).json({ message: "Dominio y subdominio requeridos" });
      return;
    }

    const fullSubdomainId = `${subdomainName}.${domain}`;

    const docRef = firestore.collection("subdomains").doc(fullSubdomainId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      res.status(404).json({ message: "Subdominio no encontrado" });
      return;
    }

    res.status(200).json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Error fetching subdomain by name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
