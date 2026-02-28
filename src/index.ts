import express from "express";
import { identify } from "./services/identify.service";

const app = express();
const PORT = 3000;

app.use(express.json());   // ← MUST be here

app.post("/identify", async (req, res) => {
    const { email, phoneNumber } = req.body;

    const result = await identify(email, phoneNumber);
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});