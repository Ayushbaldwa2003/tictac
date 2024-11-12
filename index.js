const http = require("http");
const express = require("express");
const WebSocketServer = require("websocket").server;
const path = require("path"); // Import path to resolve static files

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocketServer({
  httpServer: server,
});

const clients = {};
const games = {};
let chance = "X";
if (Math.floor(Math.random() * 2) === 1) {
  chance = "O";
}

app.use(express.static(__dirname));

// Serve the main page (index.html) for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("opened!"));
  connection.on("close", () => console.log("closed!"));
  connection.on("message", (message) => {
    const result = JSON.parse(message.utf8Data);

    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = Math.floor(Math.random() * 100000);
      games[gameId] = {
        id: gameId,
        clients: [],
      };
      const game = games[gameId];
      game.clients.push({
        clientId: clientId,
        Symbol: "X",
      });
      const payLoad = {
        method: "create",
        game: games[gameId],
      };
      const con = clients[clientId].connection;
      con.send(JSON.stringify(payLoad));
    }

    if(result.method == "resetgame"){
      const gameId = result.game;
      const game = games[gameId];
      const payload={
        method: "resetgame",
      }
      game.clients.forEach((c) => {
        console.log("hi");
        clients[c.clientId].connection.send(JSON.stringify(payload));
      });
    }

    if (result.method == "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game && game.clients.length == 1) {
        game.clients.push({
          clientId: clientId,
          Symbol: "O",
        });

        const payLoad = {
          method: "join",
          game: game,
        };
        game.clients.forEach((c) => {
          const payload1 = {
            method: "showsymbol",
            symbol: c.Symbol,
          };
          clients[c.clientId].connection.send(JSON.stringify(payLoad));
          clients[c.clientId].connection.send(JSON.stringify(payload1));
          if (c.Symbol === chance) {
            const payload = {
              method: "yourturn",
            };
            clients[c.clientId].connection.send(JSON.stringify(payload));
          }
        });
      }
    }

    if (result.method === "play") {
      const game = games[result.gameId];
      const clientId = result.clientId;
      game.clients.forEach((c) => {
        if (c.clientId === clientId && c.Symbol === chance) {
          const payLoad = {
            method: "update",
            symbol: chance,
            box: result.box,
          };
          chance = chance === "X" ? "O" : "X";
          game.clients.forEach((c) => {
            const payload = {
              method: "yourturn",
            };
            clients[c.clientId].connection.send(JSON.stringify(payload));
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
          });
        }
      });
    }
  });

  const clientId = guid();
  clients[clientId] = { connection };

  const payLoad = {
    method: "connect",
    clientId: clientId,
  };
  connection.send(JSON.stringify(payLoad));
});

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substr(0, 3) +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:3000");
});
