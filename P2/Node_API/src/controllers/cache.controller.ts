import { Request, Response } from "express";
import { firestore } from "../firebase";
import validator from "validator";
import countries from "i18n-iso-countries";

export const registerCache = async (req: Request, res: Response) => {
  try {
    const { country, ip } = req.body;
    if (!country || !ip) {
      res.status(400).json({ message: "País e IP son requeridos." });
      return;
    }

    const isValidCountry = countries.isValid(country);
    if (!isValidCountry) {
      res.status(400).json({ message: "Código de país no válido." });
      return;
    }

    const isValidIp = validator.isIP(ip, 4);
    if (!isValidIp) {
      res.status(400).json({ message: "Dirección IP no válida." });
      return;
    }

    await firestore
      .collection("zonal_caches")
      .doc(country)
      .set({ ip }, { merge: true });

    res.status(200).json({ message: "Zonal Cache registrado correctamente." });
  } catch (error) {
    console.error("Error registering cache:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
