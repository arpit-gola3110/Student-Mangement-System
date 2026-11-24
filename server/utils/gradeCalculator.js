/**
 * AKTU 10-Point Letter Grading Scale Converter
 * Conforms to Dr. A.P.J. Abdul Kalam Technical University (AKTU) B.Tech Ordinance
 */
export const calculateGrade = (marksObtained, maxMarks = 100) => {
  const percentage = (marksObtained / maxMarks) * 100;

  if (percentage >= 90) return { grade: 'A+', gradePoints: 10, description: 'Outstanding' };
  if (percentage >= 80) return { grade: 'A', gradePoints: 9, description: 'Excellent' };
  if (percentage >= 70) return { grade: 'B+', gradePoints: 8, description: 'Very Good' };
  if (percentage >= 65) return { grade: 'B', gradePoints: 7, description: 'Good' };
  if (percentage >= 55) return { grade: 'C', gradePoints: 6, description: 'Above Average' };
  if (percentage >= 50) return { grade: 'D', gradePoints: 5, description: 'Average' };
  if (percentage >= 40) return { grade: 'P', gradePoints: 4, description: 'Pass' };
  return { grade: 'F', gradePoints: 0, description: 'Fail' };
};

/**
 * AKTU Semester Grade Point Average (SGPA) Calculator
 * Formula: SGPA = Sum(Subject Credits * Subject Grade Points) / Sum(Subject Credits)
 */
export const calculateSGPA = (subjectResults = []) => {
  if (!subjectResults || subjectResults.length === 0) return 0;

  let totalCredits = 0;
  let totalWeightedPoints = 0;

  for (const item of subjectResults) {
    const credits = Number(item.credits) || 0;
    const gradePoints = Number(item.gradePoints) || 0;

    totalCredits += credits;
    totalWeightedPoints += credits * gradePoints;
  }

  if (totalCredits === 0) return 0;
  const sgpa = totalWeightedPoints / totalCredits;
  return Number(sgpa.toFixed(2));
};
