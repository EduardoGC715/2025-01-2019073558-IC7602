import { Request, Response } from "express";
import { firestore } from "../firebase";
import { WriteBatch } from "firebase-admin/firestore";

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

export const addSubdomain = async (req: Request, res: Response) => {};
