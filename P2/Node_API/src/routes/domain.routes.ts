import { Router } from "express";

import { registerDomain, getUserDomains } from "../controllers/domain.controller";

const router = Router();
router.post("/register", registerDomain);

router.get("/domains", getUserDomains);


export default router;
