import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

const userState = [];

app.post("/new-user", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    const result = {
      status: "error",
      message: "Name is required!",
    };
    return res.status(400).json(result);
  }

  const isExist = userState.find((user) => user.name === name);

  if (!isExist) {
    const newUser = {
      id: randomUUID(),
      name: name,
    };

    userState.push(newUser);

    const result = {
      status: "ok",
      user: newUser,
    };
    return res.json(result);
  } else {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    return res.status(409).json(result);
  }
});

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });

wsServer.on("connection", (ws) => {
  for (const client of wsServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(userState));
    }
  }

  ws.on("message", (msg) => {
    const receivedMSG = JSON.parse(msg);

    if (receivedMSG.type === "exit") {
      const idx = userState.findIndex((user) => user.name === receivedMSG.user.name);
      userState.splice(idx, 1);
    }

    for (const client of wsServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server has been started on http://localhost:${port}`);
});