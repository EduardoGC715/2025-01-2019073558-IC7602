import { Router } from "express";

import { registerDomain } from "../controllers/domain.controller";

const router = Router();
router.post("/register", registerDomain);

export default router;
