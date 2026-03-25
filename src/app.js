import express from "express";
import supabase from "./db/supabase.js";
import inputRoutes from "./routes/inputRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import scrapeRoutes from "./routes/scrapeRoutes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
}); 
 
app.use("/input", inputRoutes);
app.use("/search", searchRoutes);
app.use("/scrape-data", scrapeRoutes);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});