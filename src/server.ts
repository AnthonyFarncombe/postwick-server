import http from "http";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import chalk from "chalk";

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

server.applyMiddleware({ app });

app.get("/", (_req, res) => {
  res.json({ hello: "world" });
});

socketModule(httpServer);

const port = process.env.PORT && typeof process.env.PORT === "number" ? parseInt(process.env.PORT) : 3000;
httpServer.listen(port, () =>
  console.log(chalk.green(`Server running on http://localhost:${port}${server.graphqlPath}`)),
);
