import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import { generateToken } from '../utils/tokenGenerator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide both email and password', null, 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return sendError(res, 'Invalid credentials or account suspended', null, 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', null, 401);
    }

    user.lastLogin = new Date();
    await user.save();

    let profile = null;
    if (user.role === 'STUDENT') {
      profile = await Student.findOne({ user: user._id }).populate('department');
    } else if (user.role === 'FACULTY') {
      profile = await Faculty.findOne({ user: user._id }).populate('department');
    }

    const token = generateToken({
      userId: user._id,
      role: user.role,
      profileId: profile?._id || null
    });

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return sendError(res, 'User not found', null, 404);
    }

    let profile = null;
    if (user.role === 'STUDENT') {
      profile = await Student.findOne({ user: user._id }).populate('department');
    } else if (user.role === 'FACULTY') {
      profile = await Faculty.findOne({ user: user._id }).populate('department');
    }

    return sendSuccess(res, 'Current session retrieved', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Both current and new passwords are required', null, 400);
    }

    const user = await User.findById(req.user.userId);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password incorrect', null, 401);
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};
