import express from 'express';

const app = express();

app.get('/', (_req, res) => {
  res.send('Hello');
});

app.listen(8000, () => console.log('Server running on port 8000'));
