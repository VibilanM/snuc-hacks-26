import express from "express";
import cors from "cors";
import supabase from "./db/supabase.js";
import inputRoutes from "./routes/inputRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import scrapeRoutes from "./routes/scrapeRoutes.js";
import normalizeRoutes from "./routes/normalizeRoutes.js";
import snapshotRoutes from "./routes/snapshotRoutes.js";
import changeRoutes from "./routes/changeRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
}); 
 
app.use("/input", inputRoutes);
app.use("/search", searchRoutes);
app.use("/scrape-data", scrapeRoutes);
app.use("/normalize-data", normalizeRoutes);
app.use("/snapshots", snapshotRoutes);
app.use("/changes", changeRoutes);
app.use("/insights", insightRoutes);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});