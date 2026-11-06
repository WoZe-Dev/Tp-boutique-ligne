import express from "express";
import cors from "cors";
import { db } from "./db";
import { User, Product, Order } from "./types";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

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

app.get("/orders/:id", async (req, res) => {
  const orders: Order[] = await db.getData("/orders");
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  res.json(order);
});

app.post("/orders", async (req, res) => {
  const userId: unknown = req.body?.userId;
  const productId: unknown = req.body?.productId;
  const quantity: unknown = req.body?.quantity;

  if (!isPositiveInteger(userId) || !isPositiveInteger(productId) || !isPositiveInteger(quantity)) {
    res.status(400).json({ error: "userId, productId et quantity doivent être des entiers positifs" });
    return;
  }

  const users: User[] = await db.getData("/users");
  if (!users.some((u) => u.id === userId)) {
    res.status(404).json({ error: "Client introuvable" });
    return;
  }

  const products: Product[] = await db.getData("/products");
  const productIndex = products.findIndex((p) => p.id === productId);
  const product = products[productIndex];
  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  if (product.stock < quantity) {
    res.status(400).json({ error: "Stock insuffisant" });
    return;
  }

  product.stock -= quantity;
  await db.push(`/products[${productIndex}]`, product);

  const orders: Order[] = await db.getData("/orders");
  const order: Order = {
    id: Math.max(0, ...orders.map((o) => o.id)) + 1,
    userId,
    productId,
    quantity,
    status: "preparing",
    createdAt: new Date().toISOString(),
  };
  await db.push("/orders[]", order);

  res.status(201).json(order);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
