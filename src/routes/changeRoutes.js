import express from "express";
import { detectChanges } from "../controllers/changeController.js";

const router = express.Router();

router.post("/detect", detectChanges);

export default router;
