import { Router } from "express";
import { authenticate, requirePermission } from "../middleware/auth.js";
import {
  authorizeModuleAction,
  createRecordController,
  deleteRecordController,
  getRecordController,
  listModulesController,
  listRecordsController,
  restoreRecordController,
  updateRecordController,
} from "./records.controller.js";

const router = Router();

router.use(authenticate);
router.get("/", requirePermission("modules:read"), listModulesController);
router.get("/:moduleId/records", authorizeModuleAction("read"), listRecordsController);
router.post("/:moduleId/records", authorizeModuleAction("create"), createRecordController);
router.get("/:moduleId/records/:recordId", authorizeModuleAction("read"), getRecordController);
router.put("/:moduleId/records/:recordId", authorizeModuleAction("update"), updateRecordController);
router.delete("/:moduleId/records/:recordId", authorizeModuleAction("delete"), deleteRecordController);
router.post("/:moduleId/records/:recordId/restore", authorizeModuleAction("update"), restoreRecordController);

export default router;
