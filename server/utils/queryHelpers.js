/**
 * Escapes special regex metacharacters to safely match search terms in MongoDB $regex queries.
 */
export const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits a full name string into firstName and lastName cleanly.
 */
export const splitFullName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'User', lastName: '-' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '-' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

/**
 * Computes sanitized pagination skip/limit and standardized pagination metadata.
 */
export const buildPagination = (page = 1, limit = 10, maxLimit = 100) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(maxLimit, Math.max(1, Number(limit) || 10));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
};

export const formatPaginationMeta = (page, limit, totalRecords) => ({
  pagination: {
    page,
    limit,
    total: totalRecords,
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit))
  }
});

/**
 * Maps a whitelisted sortBy key and direction to a Mongoose sort specification.
 */
export const buildSortSpec = (sortBy, sortOrder = 'asc', allowedFields = {}, defaultSort = { createdAt: -1 }) => {
  if (!sortBy || !allowedFields[sortBy]) return defaultSort;
  const dir = sortOrder === 'desc' ? -1 : 1;
  return { [allowedFields[sortBy]]: dir, _id: dir };
};
