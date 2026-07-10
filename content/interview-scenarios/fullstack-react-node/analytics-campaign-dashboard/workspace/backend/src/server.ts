import app from "./app";

const port = Number(process.env.PORT ?? 4340);

app.listen(port, "127.0.0.1", () => {
  console.log(`Analytics Campaign Dashboard API listening on http://127.0.0.1:${port}`);
});
