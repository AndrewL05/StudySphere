import dotenv from 'dotenv';

dotenv.config();

import express from 'express';
import cors from 'cors';
import mainApiRouter from './routes/index.js';
//import { testApiKey } from './services/openRouterService.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN_DEV,
  process.env.FRONTEND_ORIGIN_PROD
].filter(Boolean); 

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from the specified Origin: ${origin}`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api', mainApiRouter);

app.get('/', (req, res) => {
  res.send('StudySphere Backend is running!');
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.message, err.stack || '');
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'An unexpected error occurred.',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log('Allowed CORS origins:', allowedOrigins);

  //testApiKey();
});
