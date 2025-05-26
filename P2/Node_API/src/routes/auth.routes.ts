import { Router } from "express";

import {
  registerUser,
  loginUser,
  loginSubdomainUser,
  logoutUser,
  validateSubdomainSession,
} from "../controllers/auth.controller";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login/subdomain", loginSubdomainUser);
router.get("/logout", logoutUser);
router.get("/validate", validateSubdomainSession);
export default router;
