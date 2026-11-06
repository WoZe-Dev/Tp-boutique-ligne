import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
