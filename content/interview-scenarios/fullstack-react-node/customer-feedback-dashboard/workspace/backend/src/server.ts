import app from "./app";

const port = Number(process.env.PORT ?? 4310);

app.listen(port, "127.0.0.1", () => {
  console.log(`Feedback API listening on http://127.0.0.1:${port}`);
});
