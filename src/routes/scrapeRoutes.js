import express from "express";
import { scrapeData } from "../controllers/scrapeController.js";

const router = express.Router();

router.post("/", scrapeData);

export default router;
