import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import ApiError from '../utils/ApiError.js';
import { generateToken } from '../utils/tokenGenerator.js';

/**
 * Resolves role-specific institutional profile safely.
 */
export const resolveUserProfile = async (user) => {
  const normalizedRole = (user.role || '').toLowerCase();
  if (normalizedRole === 'student') {
    return Student.findOne({ user: user._id }).populate('department').lean();
  }
  if (normalizedRole === 'faculty') {
    return Faculty.findOne({ user: user._id }).populate('department').lean();
  }
  return null;
};

/**
 * Shapes a sanitized user payload free of password hashes or internal tokens.
 */
export const formatSafeUser = (user, profile = null) => ({
  id: user._id.toString(),
  name: user.name || (profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email?.split('@')[0]),
  email: user.email,
  role: (user.role || 'student').toLowerCase(),
  isActive: user.isActive,
  lastLogin: user.lastLogin || null,
  profile
});

/**
 * Authenticates credentials without revealing whether an email exists.
 */
export const authenticateUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Your account has been deactivated. Please contact the administrator.');
  }

  // Update lastLogin cleanly without triggering unnecessary password modification
  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
  user.lastLogin = new Date();

  const profile = await resolveUserProfile(user);
  const token = generateToken({
    userId: user._id,
    tokenVersion: user.tokenVersion || 0
  });

  return {
    token,
    user: formatSafeUser(user, profile)
  };
};

/**
 * Retrieves current authenticated user profile from MongoDB.
 */
export const getCurrentUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User account no longer exists');
  }
  if (!user.isActive) {
    throw ApiError.unauthorized('Account is inactive');
  }

  const profile = await resolveUserProfile(user);
  return formatSafeUser(user, profile);
};

/**
 * Increments tokenVersion to revoke all previously issued JWTs for the user.
 */
export const revokeUserSessions = async (userId) => {
  if (!userId) return;
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
};

/**
 * Updates user password securely and revokes all prior sessions.
 */
export const updateUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or inactive');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  const token = generateToken({
    userId: user._id,
    tokenVersion: user.tokenVersion
  });

  return { token, role: (user.role || 'student').toLowerCase() };
};
