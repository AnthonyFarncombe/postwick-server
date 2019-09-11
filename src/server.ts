import express from 'express';
import chalk from 'chalk';

import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express();

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.get('/', (_req, res) => {
  res.json({ hello: 'World' });
});

const port = process.env.PORT && typeof process.env.PORT === 'number' ? parseInt(process.env.PORT) : 3000;
app.listen(port, () => console.log(chalk.green(`Server running on http://localhost:${port}`)));
