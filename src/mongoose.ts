import mongoose from 'mongoose';
import chalk from 'chalk';

mongoose.connect(process.env.MONGODB_ADDR || 'mongodb://127.0.0.1:27017/postwick', {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', () => console.error(chalk.red('Mongoose connection error')));
db.on('open', () => console.log(chalk.green('Mongoose connected')));
