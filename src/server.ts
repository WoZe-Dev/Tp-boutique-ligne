import express from "express";
import cors from "cors";
import { db } from "./db";
import { User, Product, Order } from "./types";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/users", async (_req, res) => {
  const users: User[] = await db.getData("/users");
  res.json(users);
});

app.get("/products", async (_req, res) => {
  const products: Product[] = await db.getData("/products");
  res.json(products);
});

app.get("/orders", async (_req, res) => {
  const orders: Order[] = await db.getData("/orders");
  res.json(orders);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
