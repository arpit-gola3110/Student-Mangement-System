import jwt from 'jsonwebtoken';

export const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secret_jwt_signing_key_for_aktu_student_management_system_2026_27',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};
