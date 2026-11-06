import express from "express";
import cors from "cors";
import { db } from "./db";
import { subscribe, broadcast } from "./sse";
import { User, Product, Order, Status } from "./types";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

const statuses: Status[] = ["preparing", "shipped", "delivered", "cancelled"];

const nextStatus: Record<Status, Status | null> = {
  preparing: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

function isStatus(value: unknown): value is Status {
  return statuses.some((s) => s === value);
}

function canChangeStatus(from: Status, to: Status): boolean {
  if (to === "cancelled") return from === "preparing";
  return nextStatus[from] === to;
}

const DELIVERY_DELAY = 20_000;

function scheduleDelivery(orderId: number) {
  setTimeout(async () => {
    const orders: Order[] = await db.getData("/orders");
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    const order = orders[orderIndex];
    if (!order || order.status !== "shipped") return;

    order.status = "delivered";
    await db.push(`/orders[${orderIndex}]`, order);
    broadcast("order-status-changed", order, order.id);
  }, DELIVERY_DELAY);
}

async function resumeDeliveries() {
  const orders: Order[] = await db.getData("/orders");
  for (const order of orders) {
    if (order.status === "shipped") scheduleDelivery(order.id);
  }
}

app.get("/stream", (_req, res) => {
  subscribe(res);
});

app.get("/orders/:id/stream", async (req, res) => {
  const orders: Order[] = await db.getData("/orders");
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }
  subscribe(res, order.id);
});

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
  broadcast("stock-changed", product);

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
  broadcast("order-created", order, order.id);

  res.status(201).json(order);
});

app.put("/orders/:id", async (req, res) => {
  const status: unknown = req.body?.status;
  if (!isStatus(status)) {
    res.status(400).json({ error: "status doit valoir shipped, delivered ou cancelled" });
    return;
  }

  const orders: Order[] = await db.getData("/orders");
  const orderIndex = orders.findIndex((o) => o.id === Number(req.params.id));
  const order = orders[orderIndex];
  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  if (!canChangeStatus(order.status, status)) {
    res.status(400).json({ error: `Impossible de passer de ${order.status} à ${status}` });
    return;
  }

  if (status === "cancelled") {
    const products: Product[] = await db.getData("/products");
    const productIndex = products.findIndex((p) => p.id === order.productId);
    const product = products[productIndex];
    if (product) {
      product.stock += order.quantity;
      await db.push(`/products[${productIndex}]`, product);
      broadcast("stock-changed", product);
    }
  }

  order.status = status;
  await db.push(`/orders[${orderIndex}]`, order);
  broadcast(status === "cancelled" ? "order-cancelled" : "order-status-changed", order, order.id);

  if (status === "shipped") scheduleDelivery(order.id);

  res.json(order);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
resumeDeliveries();
