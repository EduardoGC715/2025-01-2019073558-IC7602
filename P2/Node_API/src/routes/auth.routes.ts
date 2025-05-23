import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/auth.controller";

const router = Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);


export default router;
