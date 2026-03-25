import app from './app';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.PORT || '3001');

app.listen(PORT, () => {
  logger.info(`ACTOBER API running on port ${PORT}`);
});
