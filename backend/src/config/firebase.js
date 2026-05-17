'use strict';

const admin = require('firebase-admin');
const env = require('./env');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      privateKey: env.firebase.privateKey,
      clientEmail: env.firebase.clientEmail,
    }),
  });
}

module.exports = {
  messaging: admin.messaging(),
  admin,
};
