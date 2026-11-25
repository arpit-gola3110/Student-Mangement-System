import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import * as policyService from '../services/resultPolicyService.js';

export const listPolicies = asyncHandler(async (req, res) => {
  const result = await policyService.listPolicies(req.query);
  return ApiResponse.success(
    res,
    { policies: result.policies },
    'Academic result policies retrieved successfully',
    { pagination: result.pagination }
  );
});

export const getPolicyById = asyncHandler(async (req, res) => {
  const policy = await policyService.getPolicyById(req.params.id);
  return ApiResponse.success(res, { policy }, 'Academic result policy retrieved successfully');
});

export const createPolicy = asyncHandler(async (req, res) => {
  const policy = await policyService.createPolicy(req.body, req.user.userId);
  res.locals.auditEntityId = policy._id;
  res.locals.auditDetails = {
    code: policy.code,
    evaluationMode: policy.evaluationMode,
    policyVersion: policy.policyVersion
  };
  return ApiResponse.created(res, { policy }, 'Academic result policy created successfully');
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const policy = await policyService.updatePolicy(req.params.id, req.body, req.user.userId);
  res.locals.auditEntityId = policy._id;
  res.locals.auditDetails = {
    code: policy.code,
    policyVersion: policy.policyVersion,
    updatedFields: Object.keys(req.body || {})
  };
  return ApiResponse.success(res, { policy }, 'Academic result policy updated cleanly');
});

export const updatePolicyStatus = asyncHandler(async (req, res) => {
  const policy = await policyService.updatePolicyStatus(
    req.params.id,
    req.body.isActive,
    req.user.userId
  );
  res.locals.auditEntityId = policy._id;
  res.locals.auditDetails = { isActive: policy.isActive };
  return ApiResponse.success(
    res,
    { policy },
    policy.isActive ? 'Result policy activated' : 'Result policy deactivated'
  );
});
