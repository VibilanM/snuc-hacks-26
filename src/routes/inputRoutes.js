import express from "express";
import { getInput } from "../controllers/inputController.js";

const router = express.Router();

router.post("/", getInput);

export default router;
