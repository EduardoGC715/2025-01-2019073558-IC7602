import { Router } from "express";

import {
  registerDomain,
  getUserDomains,
  deleteDomain,
  verifyDomainOwnership,
} from "../controllers/domain.controller";

const router = Router();
router.post("/register", registerDomain);

router.get("/all", getUserDomains);

router.delete("/:domain", deleteDomain);

router.get("/verify/", verifyDomainOwnership);

export default router;
