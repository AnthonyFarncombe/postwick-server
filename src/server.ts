import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import chalk from 'chalk';

import typeDefs from './typeDefs';
import resolvers from './resolvers';

import authRouter from './routes/auth';
import usersRouter from './routes/users';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }): { ip: string | undefined } => {
    const ip = req.connection.remoteAddress;
    return { ip };
  },
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

server.applyMiddleware({ app: app });

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.get('/', (_req, res) => {
  res.json({ hello: 'World' });
});

const port = process.env.PORT && typeof process.env.PORT === 'number' ? parseInt(process.env.PORT) : 3000;
app.listen(port, () => console.log(chalk.green(`Server running on http://localhost:${port}${server.graphqlPath}`)));
