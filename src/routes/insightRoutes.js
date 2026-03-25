import express from "express";
import { generateInsights } from "../controllers/insightController.js";

const router = express.Router();

router.post("/generate", generateInsights);

export default router;
