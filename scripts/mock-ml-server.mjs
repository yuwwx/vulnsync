import http from "node:http";

const port = Number(process.env.MOCK_ML_PORT ?? 4010);

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/api/v1/chat/completions") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const userMessages = messages.filter((message) => message.role === "user");
    const lastMessage = userMessages.at(-1)?.content ?? "";
    const answer = userMessages.length > 1
      ? `Заглушка ML получила уточнение:\n\n${lastMessage}\n\nИстория сообщений: ${messages.length}.`
      : "Заглушка ML: уязвимость требует проверки. Проверьте версии зависимостей в package.json и lock-файле, использование уязвимого функционала и наличие зависимости в production.";

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      id: "mock-completion",
      choices: [{ message: { role: "assistant", content: answer } }],
    }));
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock ML listening on http://127.0.0.1:${port}`);
});
