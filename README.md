# Tp-boutique-ligne

Dépôt : https://github.com/WoZe-Dev/Tp-boutique-ligne.git

1. `git clone https://github.com/WoZe-Dev/Tp-boutique-ligne.git`
2. `cd Tp-boutique-ligne`
3. `docker compose up --build -d`
4. http://localhost:3000

## API

- `GET /users` : 200
- `GET /products` : 200
- `GET /orders` : 200
- `GET /orders/:id` : 200, 404
- `POST /orders` avec `{ "userId", "productId", "quantity" }` : 201, 400, 404
- `PUT /orders/:id` avec `{ "status": "shipped" | "delivered" | "cancelled" }` : 200, 400, 404
- `GET /stream` : flux SSE de toutes les commandes et du stock
- `GET /orders/:id/stream` : flux SSE d'une seule commande, 404
- Page de suivi : http://localhost:3000/suivi.html?id=1
