const express = require('express');
const cors = require('cors');
const path = require('path');

const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const kudosRoutes = require('./routes/kudos');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(requestLogger);

// Serve the frontend as static files so the whole app can run from one server
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kudos', kudosRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
