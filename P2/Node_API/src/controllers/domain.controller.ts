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
import * as dns from "dns/promises";

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
    if (!session) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const flipped_domain = domain.trim().split(".").reverse().join("/");
    const domainRef = database.ref(`domains/${flipped_domain}/_registered`);
    const domainSnapshot = await domainRef.once("value");
    if (domainSnapshot.exists()) {
      res.status(400).json({ message: "El dominio ya está registrado" });
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
    updates[`domains/${flipped_domain}/_registered`] = true;

    await database.ref().update(updates);

    const userDocRef = firestore.collection("users").doc(session.user);
    const domainDocRef = userDocRef.collection("domains").doc(domain);
    await domainDocRef.set(domainData, { merge: true });

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

    const domainsSnapshot = await firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .get();

    if (domainsSnapshot.empty) {
      res.status(200).json({});
      return;
    }
    const domains: Record<string, any> = {};

    domainsSnapshot.forEach((doc) => {
      domains[doc.id] = doc.data();
    });

    res.status(200).json({ domains });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDomain = async (req: Request, res: Response) => {
  try {
    const { session } = req;
    const { domain } = req.params;

    if (!session || !session.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!domain) {
      res.status(400).json({ message: "Dominio requerido" });
      return;
    }

    const userDomainRef = firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .doc(domain);

    const userDomainDoc = await userDomainRef.get();

    if (!userDomainDoc.exists) {
      res.status(404).json({ message: "Dominio no encontrado" });
      return;
    }

    const flipped_domain = domain.trim().split(".").reverse().join("/");
    const domainRef = database.ref(`domains/${flipped_domain}`);
    await domainRef.remove();

    // Eliminar de Firestore
    await userDomainRef.delete();

    res.status(200).json({
      message: "Dominio eliminado exitosamente",
      domain,
    });
  } catch (error) {
    console.error("Error deleting domain:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyDomainOwnership = async (req: Request, res: Response) => {
  const { session } = req;

  if (!session || !session.user) {
    console.log("No hay sesión de usuario");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {

    const domainsSnapshot = await firestore
      .collection("users")
      .doc(session.user)
      .collection("domains")
      .where("validated", "==", false)
      .get();


    if (domainsSnapshot.empty) {
      console.log("No hay dominios para verificar");
      res.status(200).json({ message: "No hay dominios pendientes de verificar" });
      return;
    }

    const results: Record<string, any> = {};

    for (const doc of domainsSnapshot.docs) {
      const domain = doc.id;
      const data = doc.data();

      if (!data?.validation) {
        results[domain] = { verified: false, error: "Faltan datos de validación" };
        continue;
      }

      const { subdomain, token } = data.validation;
      const fullDomain = `${subdomain}.${domain}`;

      try {
        const txtRecords: string[][] = await dns.resolveTxt(fullDomain);

        if (!txtRecords.length) {
          results[domain] = { verified: false, error: "No se encontró el registro TXT" };
          continue;
        }

        const receivedToken = txtRecords[0][0].replace(/"/g, "");

        if (receivedToken !== token) {
          results[domain] = { verified: false, error: "Token no coincide" };
          continue;
        }

        await doc.ref.update({ validated: true });
        results[domain] = { verified: true, message: "Dominio verificado correctamente" };

      } catch (dnsError) {
        results[domain] = {
          verified: false,
          error: "Error al resolver registro TXT"
        };
      }
    }

    res.status(200).json({
      message: "Proceso de verificación completado",
      results
    });

  } catch (err) {
    console.error("Error general en verificación:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
