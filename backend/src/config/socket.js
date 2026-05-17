'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/cluster-adapter');
const jwt = require('jsonwebtoken');
const env = require('./env');
const logger = require('../utils/logger');

let _io = null;

const initSocket = (httpServer) => {
  _io = new Server(httpServer, {
    cors: {
      origin: env.corsOptions.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  if (env.isProduction) {
    _io.adapter(createAdapter());
  }

  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      socket.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  _io.on('connection', (socket) => {
    logger.debug(`Socket connected: user ${socket.userId}`);

    socket.on('join_order', ({ orderId }) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      logger.debug(`Socket joined room order:${orderId}`);
    });

    socket.on('leave_order', ({ orderId }) => {
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user ${socket.userId}`);
    });
  });

  logger.info('Socket.io initialized');
  return _io;
};

const getIO = () => {
  if (!_io) throw new Error('Socket.io not initialized — call initSocket() first');
  return _io;
};

module.exports = { initSocket, getIO };
