import AuditLog from '../models/AuditLog.js';

export const logAuditEvent = (action, entity) => {
  return async (req, res, next) => {
    // Intercept response finish to log after successful response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      res.send(data);

      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          AuditLog.create({
            actor: req.user.userId || req.user.id,
            actorRole: req.user.role,
            action,
            entity,
            entityId: req.params.id || null,
            ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
            details: {
              method: req.method,
              url: req.originalUrl,
              bodyKeys: Object.keys(req.body || {})
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
