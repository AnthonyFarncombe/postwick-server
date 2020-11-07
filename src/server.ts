import http from "http";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import chalk from "chalk";

import routes from "./routes";

import socketModule from "./socket";

const app = express();

const httpServer = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

app.use("/api", routes);

socketModule(httpServer);

let port: number;
try {
  port = parseInt(process.env.PORT || "undefined");
} catch (err) {
  port = 3000;
}

httpServer.listen(port, () => console.log(chalk.green(`Server running on http://localhost:${port}`)));
