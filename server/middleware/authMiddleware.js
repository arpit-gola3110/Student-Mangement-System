import jwt from 'jsonwebtoken';
import { sendError } from '../utils/responseHandler.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication token missing or invalid format', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_signing_key_for_aktu_student_management_system_2026_27'
    );
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', error.message, 401);
  }
};
