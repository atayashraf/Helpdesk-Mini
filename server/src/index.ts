import { createApp } from './app';
import { env } from './config/env';
import { initializeDatabase } from './db';

await initializeDatabase();

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${env.port}`);
});
