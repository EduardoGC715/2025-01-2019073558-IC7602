import { Router } from "express";

import {
  registerUser,
  loginUser,
  loginSubdomainUser,
  loginSubdomainApiKey,
  logoutUser,
  validateSubdomainSession,
} from "../controllers/auth.controller";

import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login/subdomain/user", loginSubdomainUser);
router.post("/login/subdomain/apikey", loginSubdomainApiKey);
router.get("/logout", logoutUser);
router.get("/validate", authenticateJWT, validateSubdomainSession);
export default router;
