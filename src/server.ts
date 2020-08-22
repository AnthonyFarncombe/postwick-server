import path from "path";
import http from "http";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import chalk from "chalk";

import socketModule from "./socket";
import { getCCTVImage } from "./cctv";
import { getPlateFromImage } from "./anpr";
import Visit from "./models/visit";

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

server.applyMiddleware({ app });

app.get("/api", (_req, res) => {
  res.json({ hello: "world" });
});

app.get("/api/cctv/:type?/:id?", async (req, res) => {
  try {
    if (req.params.type && /^(orig|cropped)$/.test(req.params.type) && req.params.id) {
      const visit = await Visit.findById(req.params.id);
      if (visit) {
        const filename = req.params.type === "cropped" ? visit.imageNameCropped : visit.imageNameOrig;
        if (filename && process.env.CCTV_ARCHIVE) {
          res.sendFile(path.resolve(process.env.CCTV_ARCHIVE, filename));
        } else {
          res.sendStatus(404);
        }
      } else {
        res.sendStatus(404);
        return;
      }
    } else {
      const image = await getCCTVImage();
      res.contentType("image/jpeg");
      res.send(image);
    }
  } catch (err) {
    res.json(err);
  }
});

app.get("/api/anpr", async (_req, res) => {
  try {
    const image = await getCCTVImage();
    const plate = await getPlateFromImage(image.image);
    res.json({ plate });
  } catch (err) {
    res.json(err);
  }
});

socketModule(httpServer);

const port = process.env.PORT && typeof process.env.PORT === "number" ? parseInt(process.env.PORT) : 3000;
httpServer.listen(port, () =>
  console.log(chalk.green(`Server running on http://localhost:${port}${server.graphqlPath}`)),
);
