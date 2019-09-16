import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import chalk from 'chalk';

import { getUserFromRequest, UserContext } from './auth';

import typeDefs from './typeDefs';
import resolvers from './resolvers';

import authRouter from './routes/auth';
import usersRouter from './routes/users';

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

server.applyMiddleware({ app });

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.get('/', (_req, res) => {
  res.json({ hello: 'World' });
});

const port = process.env.PORT && typeof process.env.PORT === 'number' ? parseInt(process.env.PORT) : 3000;
app.listen(port, () => console.log(chalk.green(`Server running on http://localhost:${port}${server.graphqlPath}`)));
