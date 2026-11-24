import Examination from '../models/Examination.js';
import Result from '../models/Result.js';
import { calculateGrade, calculateSGPA } from '../utils/gradeCalculator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const getExaminations = async (req, res, next) => {
  try {
    const exams = await Examination.find().populate('semester').sort({ startDate: -1 });
    return sendSuccess(res, 'Examinations list', exams);
  } catch (err) { next(err); }
};

export const createExamination = async (req, res, next) => {
  try {
    const exam = await Examination.create(req.body);
    return sendSuccess(res, 'Examination scheduled', exam, null, 201);
  } catch (err) { next(err); }
};

export const submitMarksBatch = async (req, res, next) => {
  try {
    const { examinationId, subjectId, records } = req.body;

    const operations = records.map((record) => {
      const internalMarks = Number(record.internalMarks) || 0;
      const externalMarks = Number(record.externalMarks) || 0;
      const totalMarks = internalMarks + externalMarks;
      const { grade, gradePoints } = calculateGrade(totalMarks, 100);

      return {
        updateOne: {
          filter: {
            examination: examinationId,
            student: record.studentId,
            subject: subjectId
          },
          update: {
            $set: {
              evaluatedBy: req.user.profileId || req.user.userId,
              internalMarks,
              externalMarks,
              totalMarks,
              grade,
              gradePoints,
              remarks: record.remarks || ''
            }
          },
          upsert: true
        }
      };
    });

    const result = await Result.bulkWrite(operations);
    return sendSuccess(res, 'Marks saved successfully', { count: result.upsertedCount + result.modifiedCount });
  } catch (err) { next(err); }
};

export const getStudentResults = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user.profileId;

    if (req.user.role === 'student' && req.user.profileId !== studentId) {
      return sendError(res, 'Forbidden', null, 403);
    }

    const results = await Result.find({ student: studentId })
      .populate('subject', 'code name credits type')
      .populate('examination', 'title examType academicYear')
      .sort({ createdAt: -1 });

    const sgpaInput = results.map(r => ({
      credits: r.subject?.credits || 3,
      gradePoints: r.gradePoints
    }));

    const sgpa = calculateSGPA(sgpaInput);

    return sendSuccess(res, 'Student results retrieved', {
      sgpa,
      results
    });
  } catch (err) { next(err); }
};
