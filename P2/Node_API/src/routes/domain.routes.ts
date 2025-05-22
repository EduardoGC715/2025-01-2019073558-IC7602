import { Router } from "express";

import { registerDomain, getUserDomains, deleteDomain } from "../controllers/domain.controller";

const router = Router();
router.post("/register", registerDomain);

router.get("/domains", getUserDomains);

router.delete("/domains/:domain", deleteDomain);

export default router;
