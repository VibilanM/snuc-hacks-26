import supabase from "../db/supabase.js";

const getInput = (req, res) => {
    const { organisationName, industry, product } = req.body;

    if (!organisationName || !industry || !product) {
        return res.status(400).json({ error: "Missing required fields: organisationName, industry, product" });
    }

    res.status(200).json({
        message: "Input received successfully",
        data: {
            organisationName,
            industry,
            product
        }
    });
}

export { getInput };