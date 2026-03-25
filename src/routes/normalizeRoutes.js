import express from "express";
import { normalizeAndComputeTrends } from "../controllers/normalizeController.js";

const router = express.Router();

router.post("/", normalizeAndComputeTrends);

export default router;
