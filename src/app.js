import express from "express";
import supabase from "./db/supabase.js";
import inputRoutes from "./routes/inputRoutes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use("/input", inputRoutes);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});