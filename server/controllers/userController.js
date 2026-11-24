import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/userService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { users, meta } = await userService.listUsers(req.query);
  return ApiResponse.success(res, users, 'Users retrieved successfully', meta);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return ApiResponse.success(res, user, 'User details retrieved successfully');
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.locals.auditEntityId = user.id;
  res.locals.auditDetails = { role: user.role, isActive: user.isActive };
  return ApiResponse.created(res, user, 'User account created successfully');
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user.id);
  res.locals.auditEntityId = user.id;
  res.locals.auditDetails = { role: user.role, isActive: user.isActive };
  return ApiResponse.success(res, user, 'User account updated successfully');
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(req.params.id, req.body.isActive, req.user.id);
  res.locals.auditEntityId = user.id;
  res.locals.auditDetails = { isActive: user.isActive, actionType: user.isActive ? 'ACTIVATE' : 'DEACTIVATE' };
  return ApiResponse.success(
    res,
    user,
    user.isActive ? 'User account activated successfully' : 'User account deactivated successfully'
  );
});
