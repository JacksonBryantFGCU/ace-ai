import app from "./app";

const port = Number(process.env.PORT ?? 4320);

app.listen(port, "127.0.0.1", () => {
  console.log(`Incident Management API listening on http://127.0.0.1:${port}`);
});
