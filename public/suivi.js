const orderId = new URLSearchParams(location.search).get("id");

const title = document.querySelector("#title");
const productText = document.querySelector("#product");
const statusText = document.querySelector("#status");

const statusLabels = {
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function render(order) {
  statusText.textContent = statusLabels[order.status];
}

async function start() {
  const res = await fetch(`/orders/${orderId}`);
  if (!res.ok) {
    title.textContent = "Commande introuvable";
    return;
  }
  const order = await res.json();

  const products = await (await fetch("/products")).json();
  const product = products.find((p) => p.id === order.productId);

  title.textContent = `Commande n°${order.id}`;
  productText.textContent = `${order.quantity} x ${product ? product.name : "produit inconnu"}`;
  render(order);

  const source = new EventSource(`/orders/${orderId}/stream`);

  source.addEventListener("order-status-changed", (e) => {
    render(JSON.parse(e.data));
  });

  source.addEventListener("order-cancelled", (e) => {
    render(JSON.parse(e.data));
  });

  source.onerror = () => {
    console.log("Coupure, reconnexion automatique...");
  };

  window.addEventListener("pagehide", () => source.close());
}

start();
