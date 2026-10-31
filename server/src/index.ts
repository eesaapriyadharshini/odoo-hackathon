import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { productsRouter } from './routes/products';
import { plansRouter } from './routes/plans';
import { taxesRouter } from './routes/taxes';
import { discountsRouter } from './routes/discounts';
import { quotationTemplatesRouter } from './routes/quotationTemplates';
import { subscriptionsRouter } from './routes/subscriptions';
import { invoicesRouter } from './routes/invoices';
import { paymentsRouter } from './routes/payments';
import { billingRouter } from './routes/billing';
import { financeRouter } from './routes/finance';
import { auditRouter } from './routes/audit';

import { seedDatabaseIfEmpty } from './db/seed';

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Vite inline scripts and styles during dev/preview
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Brightloop Subscription Management Platform',
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/taxes', taxesRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/quotation-templates', quotationTemplatesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/finance', financeRouter);
app.use('/api/audit-logs', auditRouter);

// Serve static frontend build in production
const clientDistPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Auto-seed database if empty
seedDatabaseIfEmpty();

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`Brightloop Subscription System API listening on port ${PORT}`);
    console.log(`Ready for High Security & Sub-2s Performance`);
    console.log(`=======================================================`);
  });
}

export default app;
