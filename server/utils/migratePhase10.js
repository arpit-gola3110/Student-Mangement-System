import connectDB, { closeDatabase } from '../config/db.js';
import Result from '../models/Result.js';
import AcademicResultPolicy, { DEFAULT_GRADE_BOUNDARIES } from '../models/AcademicResultPolicy.js';

const migratePhase10 = async () => {
  await connectDB();

  const existingResults = await Result.countDocuments();
  console.log(`[Phase 10 Migration] Existing Result records: ${existingResults}`);

  await Result.syncIndexes();
  await AcademicResultPolicy.syncIndexes();

  // Seed default provisional policy only if none exists so first calculation works cleanly
  const policyCount = await AcademicResultPolicy.countDocuments();
  if (policyCount === 0) {
    await AcademicResultPolicy.create({
      name: 'Provisional B.Tech Grading Policy (2026-27)',
      code: 'PROV-BTECH-10PT-2026',
      evaluationMode: 'COMBINED',
      useSubjectMaxMarks: true,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      totalMaxMarks: 100,
      minInternalPassPercent: 0,
      minExternalPassPercent: 30,
      minTotalPassPercent: 40,
      roundingPolicy: 'DECIMAL_2',
      sgpaEnabled: true,
      cgpaEnabled: false,
      gradeBoundaries: DEFAULT_GRADE_BOUNDARIES,
      isProvisional: true,
      policyVersion: 1,
      isActive: true
    });
    console.log('[Phase 10 Migration] Seeded provisional AcademicResultPolicy (PROV-BTECH-10PT-2026)');
  }

  console.log('[Phase 10 Migration Complete] Result and AcademicResultPolicy synchronized cleanly.');
  await closeDatabase();
};

migratePhase10().catch(async (err) => {
  console.error('[Phase 10 Migration Error]', err);
  await closeDatabase();
  process.exit(1);
});
