import mongoose from 'mongoose';

/**
 * Executes a multi-document database unit of work inside a MongoDB ACID transaction
 * when the connected cluster supports replica-set transactions.
 * Falls back cleanly to explicit rollback compensation if running on a standalone MongoDB node.
 *
 * @param {(session: mongoose.ClientSession | null) => Promise<any>} workFn
 * @param {() => Promise<void>} compensateFn
 */
export const runWithTransactionOrCompensation = async (workFn, compensateFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await workFn(session);
    });
    return { result, mode: 'transaction' };
  } catch (err) {
    const msg = err?.message || '';
    const isUnsupportedTx =
      msg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      msg.includes('Sessions are not supported') ||
      err?.code === 20;

    if (!isUnsupportedTx) {
      throw err;
    }

    // Fallback for standalone MongoDB servers: run without session and compensate on failure
    try {
      const result = await workFn(null);
      return { result, mode: 'compensation' };
    } catch (workErr) {
      if (typeof compensateFn === 'function') {
        try {
          await compensateFn();
        } catch (compErr) {
          console.error('[Compensation Error]', compErr.message);
        }
      }
      throw workErr;
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
