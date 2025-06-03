import { Router } from "express";

import {
  getAllSubdomains,
  registerSubdomain,
  getSubdomainsByDomain,
  deleteSubdomain,
  updateSubdomain,
  getSubdomainByName,
  getWildcardSubdomains,
} from "../controllers/subdomain.controller";
import { authenticateJWT } from "../middlewares";
const router = Router();
router.get("/all", getAllSubdomains);
router.get("/wildcards", getWildcardSubdomains);

router.post("/register", authenticateJWT, registerSubdomain);

router.get("/subdomains", authenticateJWT, getSubdomainsByDomain);

router.delete("/:domain/:subdomain", authenticateJWT, deleteSubdomain);

router.put("/:domain/:subdomain", authenticateJWT, updateSubdomain);

router.get("/:domain/:subdomainName", authenticateJWT, getSubdomainByName);

export default router;
