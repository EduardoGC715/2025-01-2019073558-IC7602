import { Router } from "express";

import { registerCache } from "../controllers/cache.controller";

const router = Router();
router.post("/register", registerCache);

export default router;
