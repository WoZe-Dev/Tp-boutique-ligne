import { Response } from "express";

type Subscriber = {
  res: Response;
  orderId: number | null;
};

const subscribers = new Set<Subscriber>();
let eventId = 0;

export function subscribe(res: Response, orderId: number | null = null) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const subscriber: Subscriber = { res, orderId };
  subscribers.add(subscriber);
  console.log(`Abonné connecté, abonnés : ${subscribers.size}`);

  res.on("close", () => {
    subscribers.delete(subscriber);
    console.log(`Abonné parti, abonnés : ${subscribers.size}`);
  });
}

export function broadcast(event: string, data: unknown, orderId: number | null = null) {
  const msg = `id: ${++eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const subscriber of subscribers) {
    if (subscriber.orderId === null || subscriber.orderId === orderId) {
      subscriber.res.write(msg);
    }
  }
}
