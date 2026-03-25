import express from "express";
import { searchCompetitors } from "../controllers/searchController.js";

const router = express.Router();

router.post("/", searchCompetitors);

export default router;
