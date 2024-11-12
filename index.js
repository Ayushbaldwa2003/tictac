const http = require("http");
const express = require("express");
const app = express();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(9091, () => console.log("Listening on http port 9091"));
app.use(express.static(__dirname));
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("Listening.. on 9090"));
const clients = {};
const games = {};
let chance = "X";
if (Math.floor(Math.random() * 2) == 1) {
  chance = "O";
}

const wsServer = new websocketServer({
  httpServer: httpServer,
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
          clients[c.clientId].connection.send(JSON.stringify(payLoad));
        });
      }
    }


    if (result.method === "play") {
      const game = games[result.gameId];
      const clientId = result.clientId;
      game.clients.forEach((c) => {
        console.log(c.clientId);
        if (c.clientId === clientId && c.Symbol === chance) {
          const payLoad = {
            method: "update",
            symbol: chance,
            box: result.box,
          };
          chance = chance === "X" ? "O" : "X";
          game.clients.forEach((c) => {
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
          });
        }
      });
    }
  });

  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

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
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
