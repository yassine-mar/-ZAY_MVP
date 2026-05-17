'use strict';

const serializeUser = (user) => {
  if (!user) return null;
  const { password_hash, fcm_token, ...safe } = user;
  return safe;
};

const serializeUserPublic = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar_url: user.avatar_url,
  };
};

module.exports = { serializeUser, serializeUserPublic };
