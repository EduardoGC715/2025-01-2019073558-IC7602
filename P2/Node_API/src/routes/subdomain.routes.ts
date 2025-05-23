import { Router } from "express";

import {
  getAllSubdomains,
  registerSubdomain,
} from "../controllers/subdomain.controller";
import { authenticateJWT } from "../middlewares";
const router = Router();
router.get("/all", getAllSubdomains);

router.post("/register", authenticateJWT, registerSubdomain);
export default router;
