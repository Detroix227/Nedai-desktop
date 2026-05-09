import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import v1App from "@/api/v1/app";
import { errorHandler } from "@/middleware/error-handler";

const app = new Hono();

app.use(logger());
app.use('*', cors());

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/api/v1", v1App);

app.onError(errorHandler);

export default app;
