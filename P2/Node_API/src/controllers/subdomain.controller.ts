import { Request, Response } from "express";
import { firestore, database } from "../firebase";
import { WriteBatch } from "firebase-admin/firestore";
import validator from "validator";
import ms, { StringValue } from "ms";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { hashApiKey } from "./auth.controller";

export const getAllSubdomains = async (req: Request, res: Response) => {
  try {
    const subdomainsRef = firestore.collection("subdomains");
    const subdomainsSnapshot = await subdomainsRef.get();
    if (subdomainsSnapshot.empty) {
      res.status(404).json({ message: "No subdomains found" });
      return;
    }
    const subdomains: Record<string, any> = {};

    subdomainsSnapshot.forEach((doc) => {
      subdomains[doc.id] = doc.data();
      delete subdomains[doc.id].users;
      delete subdomains[doc.id].apiKeys;
    });

    res.status(200).json({ ...subdomains });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getWildcardSubdomains = async (req: Request, res: Response) => {
  try {
    const wildcards: Record<string, any> = {};
    const wildcardsRef = firestore.collection("wildcards");
    const wildcardsSnapshot = await wildcardsRef.get();
    if (!wildcardsSnapshot.empty) {
      wildcardsSnapshot.forEach((doc) => {
        wildcards[doc.id] = doc.data();
        delete wildcards[doc.id].users;
        delete wildcards[doc.id].apiKeys;
      });
    }
    res.status(200).json({ ...wildcards });
  } catch (error) {
    console.error("Error fetching wildcard subdomains:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
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
  newApiKeys?: string[]; // New API keys to add
  users?: Record<string, string>; // username: password
  newUsers?: Record<string, string>; // New users to add
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
      newApiKeys,
      users,
      newUsers,
      https,
      destination,
    }: registerSubdomainRequestBody = req.body as registerSubdomainRequestBody;

    if (typeof domain !== "string" || domain.trim() === "") {
      res.status(400).json({ message: "El dominio es requerido" });
      return;
    }

    const destinationRegex = /^([^:]+)(:(\d{1,5}))?$/;
    if (typeof destination !== "string") {
      res.status(400).json({ message: "Destino debe ser un string válida." });
      return;
    }

    const match = destination.match(destinationRegex);
    if (!match) {
      res.status(400).json({ message: "Destino inválido." });
      return;
    }

    const host = match[1];
    const port = match[3];

    const isValidHost =
      validator.isFQDN(host, { require_tld: false }) || validator.isIP(host);
    if (!isValidHost) {
      res
        .status(400)
        .json({ message: "Host inválido: debe ser un dominio o IP." });
      return;
    }

    if (port !== undefined) {
      const portNum = Number(port);
      if (!(portNum >= 1 && portNum <= 65535)) {
        res
          .status(400)
          .json({ message: "Puerto inválido: debe estar entre 1 y 65535." });
        return;
      }
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

    const fullDomain =
      subdomain === "" ? domain.trim() : `${subdomain.trim()}.${domain.trim()}`;
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
    const createdApiKeys: Record<string, string> = {};
    let usersMap: Record<string, string> = {};

    if (authMethod === "api-keys") {
      if (!Array.isArray(newApiKeys) || newApiKeys.length === 0) {
        res.status(400).json({
          message:
            'Debe proporcionar un arreglo "newApiKeys" con los nombres de nueva(s) API Key(es).',
        });
        return;
      }
      // No users allowed when api-keys
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
      // Generate & hash each new API key name
      for (const nickname of newApiKeys as string[]) {
        if (!nickname || typeof nickname !== "string") {
          res.status(400).json({
            message:
              "Cada nuevo nombre de API Key debe ser una cadena no vacía",
          });
          return;
        }
        const rawKey = crypto.randomBytes(32).toString("hex");
        const hashedKey = hashApiKey(rawKey);
        hashedApiKeys[hashedKey] = nickname.trim();
        createdApiKeys[rawKey] = nickname.trim();
      }
    } else if (authMethod === "user-password") {
      // 1) Extrae newUsers
      const newUsersObj =
        typeof newUsers === "object" && newUsers !== null
          ? (newUsers as Record<string, string>)
          : {};

      // 2) Validaciones iniciales
      if (Object.keys(newUsersObj).length === 0) {
        res.status(400).json({
          message:
            'Debe proporcionar un objeto "newUsers" con los pares usuario/contraseña.',
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
            "La lista de API keys debe estar vacía cuando el método de autenticación sea usuario/contraseña",
        });
        return;
      }

      // 3) Validar cada nuevo usuario antes de hacer hash
      for (const [username, plainPwd] of Object.entries(newUsersObj)) {
        if (!username || typeof plainPwd !== "string" || plainPwd.length < 6) {
          res.status(400).json({
            message:
              "Cada nuevo usuario debe tener un nombre válido y una contraseña (mín. 6 caracteres)",
          });
          return;
        }
      }

      // 4) Una vez validados, hacer el hash y poblar usersMap
      usersMap = {};
      for (const [username, plainPwd] of Object.entries(newUsersObj)) {
        const salt = bcrypt.genSaltSync(10);
        usersMap[username] = bcrypt.hashSync(plainPwd, salt);
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

    const isWildcard = wildcardRe.test(subdomain);
    const cleanedSub = isWildcard
      ? subdomain.startsWith("*.")
        ? subdomain.slice(2)
        : ""
      : subdomain;

    const flipped_domain = fullDomain.trim().split(".").reverse().join("/");
    const fullDomainRef = database.ref(`domains/${flipped_domain}`);
    if (subdomain === "") {
      const rootFlagSnapshot = await fullDomainRef
        .child("_enabled")
        .once("value");
      if (rootFlagSnapshot.exists()) {
        res.status(400).json({
          message: "Ya existe un registro sin subdominio para este dominio.",
        });
        return;
      }
    } else {
      const subdomainSnapshot = await fullDomainRef.once("value");
      if (subdomainSnapshot.exists()) {
        res.status(400).json({ message: "El subdominio ya está registrado." });
        return;
      }
    }

    const targetCollection = isWildcard ? "wildcards" : "subdomains";
    const docId = cleanedSub === "" ? domain : `${cleanedSub}.${domain}`;
    console.log(
      "Target Collection:",
      targetCollection,
      " Doc ID:",
      docId,
      " Cleaned Domain:",
      cleanedSub
    );
    const subdomainRef = firestore.collection(targetCollection).doc(docId);

    const domainRefDocId = subdomain === "" ? "_root_" : subdomain;
    const domainRef = firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .doc(domain)
      .collection("subdomains")
      .doc(domainRefDocId);

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
    batch.set(subdomainRef, subdomainData);
    batch.set(domainRef, { enabled: true });

    await batch.commit();

    const updates: Record<string, any> = {};
    updates[`domains/${flipped_domain}/_enabled`] = true;

    await database.ref().update(updates);

    const response: any = { message: "Subdomain creado exitosamente" };
    if (authMethod === "api-keys") {
      response.createdApiKeys = createdApiKeys;
    }
    res.status(201).json(response);
    return;
  } catch (error) {
    console.error("Error adding subdomain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubdomain = async (req: Request, res: Response) => {
  try {
    // Revisar si la sesión es válida
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
      newApiKeys,
      users,
      newUsers,
      https,
      destination,
    }: registerSubdomainRequestBody = req.body as registerSubdomainRequestBody;

    // Validar que se proporcionen los parámetros necesarios
    if (typeof domain !== "string" || domain.trim() === "") {
      res.status(400).json({ message: "El dominio es requerido" });
      return;
    }

    // Validar que el destino sea un dominio válido o una dirección IP

    const destinationRegex = /^([^:]+)(:(\d{1,5}))?$/;
    if (typeof destination !== "string") {
      res.status(400).json({ message: "Destino debe ser un string válida." });
      return;
    }

    const match = destination.match(destinationRegex);
    if (!match) {
      res.status(400).json({ message: "Destino inválido." });
      return;
    }

    const host = match[1];
    const port = match[3];

    const isValidHost =
      validator.isFQDN(host, { require_tld: false }) || validator.isIP(host);
    if (!isValidHost) {
      res
        .status(400)
        .json({ message: "Host inválido: debe ser un dominio o IP." });
      return;
    }

    if (port !== undefined) {
      const portNum = Number(port);
      if (!(portNum >= 1 && portNum <= 65535)) {
        res
          .status(400)
          .json({ message: "Puerto inválido: debe estar entre 1 y 65535." });
        return;
      }
    }

    // Validar que el subdominio sea un FQDN válido o un wildcard
    const wildcardRe = /^(\*|\*\.[a-zA-Z0-9][a-zA-Z0-9-]*?)$/;
    const isWildcard = wildcardRe.test(subdomain);
    const cleanedSub = isWildcard
      ? subdomain.startsWith("*.")
        ? subdomain.slice(2)
        : ""
      : subdomain;
    if (
      subdomain !== "" &&
      !validator.isFQDN(subdomain, { require_tld: false }) &&
      !wildcardRe.test(subdomain)
    ) {
      res.status(400).json({ message: "Subdominio inválido" });
      return;
    }

    // Validar que el dominio completo sea un FQDN válido
    const fullDomain =
      subdomain === "" ? domain.trim() : `${subdomain.trim()}.${domain.trim()}`;
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

    // Validar que ttl sea un número positivo
    if (typeof ttl !== "number" || Number.isNaN(ttl) || ttl <= 0) {
      res.status(400).json({
        message:
          "El Time to Live debe ser un número de milisegundos o una duración válida (ej. 5m, 1h)",
      });
      return;
    }

    // Validar que https sea un booleano
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
        message: `La política de reemplazo debe ser una de las siguientes: ${allowedPolicies.join(
          ", "
        )}`,
      });
      return;
    }
    if (authMethod === "api-keys") {
      // Validar que se proporcionen las API keys
      const existingKeysObj =
        typeof apiKeys === "object" &&
        apiKeys !== null &&
        !Array.isArray(apiKeys)
          ? (apiKeys as Record<string, string>)
          : {};
      const newKeysArr =
        Array.isArray(newApiKeys) && newApiKeys !== null
          ? (newApiKeys as string[])
          : [];

      if (
        Object.keys(existingKeysObj).length === 0 &&
        newKeysArr.length === 0
      ) {
        res
          .status(400)
          .json({ message: "Debe proporcionar llaves al menos una API Key" });
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
            "La lista de usuarios debe estar vacía cuando el método es API keys",
        });
        return;
      }
    } else if (authMethod === "user-password") {
      // Validar que se proporcionen los usuarios
      const existingUsersObj =
        typeof users === "object" && users !== null && !Array.isArray(users)
          ? (users as Record<string, string>)
          : {};
      const newUsersObj =
        typeof newUsers === "object" && newUsers !== null
          ? (newUsers as Record<string, string>)
          : {};

      if (
        Object.keys(existingUsersObj).length === 0 &&
        Object.keys(newUsersObj).length === 0
      ) {
        res.status(400).json({
          message:
            "Debe proporcionar usuarios existentes o nuevos con el método usuario/contraseña",
        });
        return;
      }

      if (
        (typeof apiKeys === "object" &&
          apiKeys !== null &&
          !Array.isArray(apiKeys) &&
          Object.keys(apiKeys).length > 0) ||
        (Array.isArray(newApiKeys) && (newApiKeys as string[]).length > 0)
      ) {
        res.status(400).json({
          message:
            "La lista de API keys debe estar vacía cuando el método es usuario/contraseña",
        });
        return;
      }
    } else if (!authMethod || authMethod === "none") {
      // Validar que no se proporcionen usuarios ni API keys
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

    const existingUsersMap = (users as Record<string, string>) || {};
    const newUsersMap = (newUsers as Record<string, string>) || {};
    const usersMap: Record<string, string> = {};

    if (authMethod === "user-password") {
      // Verificar que los usuarios existentes y nuevos sean válidos
      for (const [username, hashedPassword] of Object.entries(
        existingUsersMap
      )) {
        usersMap[username] = hashedPassword;
      }
      for (const [username, plainPwd] of Object.entries(newUsersMap)) {
        if (!username || typeof plainPwd !== "string" || plainPwd.length < 6) {
          res.status(400).json({
            message:
              "Cada nuevo usuario debe tener un nombre válido y una contraseña (mín. 6 caracteres)",
          });
          return;
        }
        const salt = bcrypt.genSaltSync(10);
        usersMap[username] = bcrypt.hashSync(plainPwd, salt);
      }
    }

    const existingKeysMap = apiKeys as Record<string, string>;
    let hashedApiKeys: Record<string, string> = {};
    const createdApiKeys: Record<string, string> = {};

    if (authMethod === "api-keys") {
      // Verificar que las API keys existentes y nuevas sean válidas
      for (const [alreadyHashedKey, name] of Object.entries(existingKeysMap)) {
        hashedApiKeys[alreadyHashedKey] = name;
      }

      for (const nickname of newApiKeys || []) {
        const rawKey = crypto.randomBytes(32).toString("hex");
        const newHashedKey = hashApiKey(rawKey);
        hashedApiKeys[newHashedKey] = nickname.trim();
        createdApiKeys[rawKey] = nickname.trim();
      }
    }

    const primaryColl = isWildcard ? "wildcards" : "subdomains";
    const topDocId = isWildcard
      ? cleanedSub === ""
        ? domain
        : `${cleanedSub}.${domain}`
      : subdomain === ""
      ? domain
      : `${subdomain}.${domain}`;
    console.log(
      "Primary Collection:",
      primaryColl,
      " Top Doc ID:",
      topDocId,
      " Domain:",
      domain,
      " Subdomain:",
      subdomain
    );
    const subdomainRef = firestore.collection(primaryColl).doc(topDocId);

    const subdomainData: any = {
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

    await subdomainRef.set(subdomainData);

    const response: any = { message: "Subdomain creado exitosamente" };
    if (authMethod === "api-keys" && Object.keys(createdApiKeys).length > 0) {
      response.createdApiKeys = createdApiKeys;
    }
    res.status(200).json(response);
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
      res.status(400).json({ message: "Se requiere un Dominio y Subdomino" });
      return;
    }

    const isWildcard = subdomain.includes("*");
    const isRoot = subdomain === "_root_";
    const primaryColl = isWildcard ? "wildcards" : "subdomains";

    const cleanedSub = isWildcard
      ? subdomain.startsWith("*.")
        ? subdomain.slice(2)
        : ""
      : subdomain;

    const topDocId = isWildcard
      ? cleanedSub === ""
        ? domain
        : `${cleanedSub}.${domain}`
      : isRoot
      ? domain
      : `${subdomain}.${domain}`;
    console.log(
      "Primary Collection:",
      primaryColl,
      " Top Doc ID:",
      topDocId,
      " Domain:",
      domain,
      " Subdomain:",
      subdomain
    );
    const fullDomain = isRoot
      ? domain.trim()
      : `${subdomain.trim()}.${domain.trim()}`;
    const flippedDomain = fullDomain.trim().split(".").reverse().join("/");

    const subdomainRef = firestore.collection(primaryColl).doc(topDocId);

    const domainRef = firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .doc(domain)
      .collection("subdomains")
      .doc(isRoot ? "_root_" : subdomain);

    const batch = firestore.batch();

    batch.delete(subdomainRef);
    batch.delete(domainRef);

    await batch.commit();

    await database.ref(`domains/${flippedDomain}/_enabled`).remove();

    res.status(200).json({ message: "Subdominio eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando subdominio:", error);
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
      res.status(400).json({ message: "Se requiere un Dominio" });
      return;
    }

    const subdomainsSnapshot = await firestore.collection("subdomains").get();
    const wildcardsSnapshot = await firestore.collection("wildcards").get();
    const result: Record<string, any> = {};

    subdomainsSnapshot.forEach((doc) => {
      if (doc.id === domain || doc.id.endsWith(`.${domain}`)) {
        result[doc.id] = doc.data();
      }
    });

    wildcardsSnapshot.forEach((doc) => {
      if (doc.id === domain || doc.id.endsWith(`.${domain}`)) {
        const key = doc.id === domain ? `*.${domain}` : `*.${doc.id}`;
        result[key] = doc.data();
      }
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching subdomains:", error);
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
    console.log("Domain:", domain, "Subdomain Name:", subdomainName);
    if (!domain || !subdomainName) {
      res.status(400).json({ message: "Dominio y subdominio requeridos" });
      return;
    }

    const isRoot = subdomainName === "_root_";
    const isWildcard = subdomainName.includes("*");

    const cleaned =
      subdomainName === "*"
        ? "*"
        : subdomainName.startsWith("*.")
        ? subdomainName.slice(2)
        : subdomainName;
    const collectionName = isWildcard ? "wildcards" : "subdomains";
    const fullSubdomainId =
      cleaned === "*" || isRoot ? domain : `${cleaned}.${domain}`;

    const docRef = firestore.collection(collectionName).doc(fullSubdomainId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      res.status(404).json({ message: "Subdominio no encontrado" });
      return;
    }

    const returnedId = isWildcard
      ? fullSubdomainId === domain
        ? `*.${domain}`
        : `*.${fullSubdomainId}`
      : docSnap.id;

    res.status(200).json({ id: returnedId, ...docSnap.data() });
  } catch (error) {
    console.error("Error fetching subdomain by name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
