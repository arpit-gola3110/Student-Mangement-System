export const sendSuccess = (res, message = 'Success', data = {}, meta = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    data
  };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (res, message = 'Error', errors = [], statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    statusCode
  });
};
