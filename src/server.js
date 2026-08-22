import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';

const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, env.HOST, () => {
    console.log(`Server running on http://${env.HOST}:${env.PORT}`);
  });
};

startServer();
