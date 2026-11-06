import { Response } from "express";

const clients = new Set<Response>();
let eventId = 0;

export function subscribe(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  clients.add(res);
  console.log(`Abonné connecté, abonnés : ${clients.size}`);

  res.on("close", () => {
    clients.delete(res);
    console.log(`Abonné parti, abonnés : ${clients.size}`);
  });
}

export function broadcast(event: string, data: unknown) {
  const msg = `id: ${++eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
