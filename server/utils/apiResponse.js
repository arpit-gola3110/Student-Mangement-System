/**
 * Standard API Response envelope utility conforming to Phase 3 Section 10 specs.
 */
export class ApiResponse {
  static success(res, data = {}, message = 'Operation successful', meta = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    });
  }

  static created(res, data = {}, message = 'Resource created successfully') {
    return this.success(res, data, message, null, 201);
  }

  static error(res, message = 'An appropriate error occurred', errors = [], statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }
}

export default ApiResponse;
