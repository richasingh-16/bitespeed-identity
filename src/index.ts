import express from "express";
import { identify } from "./services/identify.service";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());   // ← MUST be here

app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    const result = await identify(email, phoneNumber);
    res.json(result);
  } catch (err: any) {
    console.error("Error in /identify:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});