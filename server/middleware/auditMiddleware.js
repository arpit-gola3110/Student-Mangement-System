import AuditLog from '../models/AuditLog.js';

const SENSITIVE_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'passwordHash', 'token']);

export const logAuditEvent = (action, entity) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      res.send(data);

      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const safeBodyKeys = Object.keys(req.body || {}).filter((k) => !SENSITIVE_KEYS.has(k));
          const entityId = res.locals?.auditEntityId || req.params.id || null;
          const extraDetails = res.locals?.auditDetails || {};

          AuditLog.create({
            actor: req.user.userId || req.user.id,
            actorRole: (req.user.role || 'admin').toUpperCase(),
            action,
            entity,
            entityId,
            ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
            details: {
              method: req.method,
              url: req.originalUrl,
              bodyKeys: safeBodyKeys,
              ...extraDetails
            }
          }).catch((err) => console.error('[Audit Log Error]', err.message));
        } catch (e) {
          console.error('[Audit Log Exception]', e.message);
        }
      }
    };
    next();
  };
};

export default logAuditEvent;
