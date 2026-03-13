import 'dotenv/config';
import app from './app';
import { initSentry } from './lib/sentry';

initSentry();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Actober API running on port ${PORT}`);
});
