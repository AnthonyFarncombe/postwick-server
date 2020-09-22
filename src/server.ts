import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import chalk from "chalk";

import routes from "./routes";

import socketModule from "./socket";

import { getUserFromRequest, UserContext } from "./auth";

import typeDefs from "./typeDefs";
import resolvers from "./resolvers";

export type ApolloContext = { ip: string | undefined; user: UserContext | undefined };

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }): Promise<ApolloContext> => {
    let user: UserContext | undefined;
    try {
      user = await getUserFromRequest(req);
    } catch (err) {}
    return { ip: req.connection.remoteAddress, user };
  },
});

const app = express();

const httpServer = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

server.applyMiddleware({ app });

app.use("/api", routes);

socketModule(httpServer);

const port = process.env.PORT && typeof process.env.PORT === "number" ? parseInt(process.env.PORT) : 3011;
httpServer.listen(port, () =>
  console.log(chalk.green(`Server running on http://localhost:${port}${server.graphqlPath}`)),
);
