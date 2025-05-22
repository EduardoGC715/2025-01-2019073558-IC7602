import { Router } from "express";

import { getAllSubdomains } from "../controllers/subdomain.controller";
const router = Router();
router.post("/all", getAllSubdomains);

export default router;
