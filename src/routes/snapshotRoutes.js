import express from "express";
import { createSnapshots } from "../controllers/snapshotController.js";

const router = express.Router();

router.post("/create", createSnapshots);

export default router;
