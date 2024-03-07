// Импорт необходимых модулей для работы сервера
import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import bodyParser from "body-parser";
import * as crypto from "crypto";

// Создание экземпляра приложения Express
const app = express();

// Использование middleware для обработки CORS
app.use(cors());

// Использование middleware для обработки тела запроса в формате JSON
app.use(
  bodyParser.json({
    // Условие, при котором middleware будет применяться ко всем запросам
    type(req) {
      return true;
    },
  })
);

// Middleware для установки заголовка Content-Type в application/json
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Массив для хранения состояния пользователей чата
const userState = [];

// Обработчик POST запроса на создание нового пользователя
app.post("/new-user", async (request, response) => {
  // Проверка наличия имени в теле запроса
  if (Object.keys(request.body).length === 0) {
    // Отправка сообщения об ошибке, если имя отсутствует
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status(400).send(JSON.stringify(result)).end();
  }

  // Получение имени нового пользователя из тела запроса
  const { name } = request.body;

  // Проверка наличия пользователя с таким именем в чате
  const isExist = userState.find((user) => user.name === name);

  if (!isExist) {
    // Генерация уникального идентификатора для нового пользователя
    const newUser = {
      id: crypto.randomUUID(),
      name: name,
    };

    // Добавление нового пользователя в состояние чата
    userState.push(newUser);

    // Отправка ответа с данными нового пользователя
    const result = {
      status: "ok",
      user: newUser,
    };
    response.send(JSON.stringify(result)).end();
  } else {
    // Отправка сообщения об ошибке, если имя пользователя уже занято
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status(409).send(JSON.stringify(result)).end();
  }
});

// Создание HTTP сервера на основе приложения Express
const server = http.createServer(app);

// Создание WebSocket сервера на основе HTTP сервера
const wsServer = new WebSocketServer({ server });

// Обработчик события подключения нового клиента к WebSocket серверу
wsServer.on("connection", (ws) => {
  // Обработчик события приема сообщения от клиента
  ws.on("message", (msg, isBinary) => {
    // Парсинг полученного сообщения в формате JSON
    const receivedMSG = JSON.parse(msg);

    // Обработка сообщения о выходе пользователя из чата
    if (receivedMSG.type === "exit") {
      // Поиск пользователя, который выходит из чата
      const idx = userState.findIndex(
        (user) => user.name === receivedMSG.user.name
      );

      // Удаление пользователя из состояния чата
      userState.splice(idx, 1);

      // Отправка обновленного списка пользователей всем клиентам чата
      [...wsServer.clients]
        .filter((o) => o.readyState === WebSocket.OPEN)
        .forEach((o) => o.send(JSON.stringify(userState)));
      return;
    }

    // Обработка сообщения для отправки в чат
    if (receivedMSG.type === "send") {
      // Отправка сообщения всем клиентам чата
      [...wsServer.clients]
        .filter((o) => o.readyState === WebSocket.OPEN)
        .forEach((o) => o.send(msg, { binary: isBinary }));
    }
  });

  // Отправка текущего состояния чата новому подключенному клиенту
  [...wsServer.clients]
    .filter((o) => o.readyState === WebSocket.OPEN)
    .forEach((o) => o.send(JSON.stringify(userState)));
});

// Определение порта для сервера (берется из переменной окружения или используется 3000 по умолчанию)
const port = process.env.PORT || 3000;

// Функция для запуска сервера
const bootstrap = async () => {
  try {
    // Слушание указанного порта сервером
    server.listen(port, () =>
      console.log(`Server has been started on http://localhost:${port}`)
    );
  } catch (error) {
    // Обработка ошибок, возникших при запуске сервера
    console.error(error);
  }
};

// Вызов функции для запуска сервера
bootstrap();