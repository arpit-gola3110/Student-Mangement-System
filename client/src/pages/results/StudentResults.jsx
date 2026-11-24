import React from 'react';
import { Award, FileText, Download } from 'lucide-react';

export const StudentResults = () => {
  const courses = [
    { code: 'BCS 501', name: 'Database Management Systems', credits: 4, internal: 44, external: 78, total: 88, grade: 'A', points: 9 },
    { code: 'BCS 502', name: 'Compiler Design', credits: 4, internal: 41, external: 72, total: 82, grade: 'A', points: 9 },
    { code: 'BCS 503', name: 'Design and Analysis of Algorithms', credits: 4, internal: 45, external: 80, total: 91, grade: 'A+', points: 10 },
    { code: 'BCS 554', name: 'Internship Assessment / Mini Project', credits: 2, internal: 48, external: 46, total: 94, grade: 'A+', points: 10 },
    { code: 'BCS 551', name: 'DBMS Lab', credits: 1, internal: 46, external: 45, total: 91, grade: 'A+', points: 10 }
  ];

  const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
  const totalPoints = courses.reduce((acc, c) => acc + c.credits * c.points, 0);
  const sgpa = (totalPoints / totalCredits).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Grade Transcript</h1>
          <p className="text-sm text-slate-500">Dr. A.P.J. Abdul Kalam Technical University (AKTU) 10-Point Credit System</p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
        >
          <Download className="w-4 h-4 mr-2" /> Download Official Gradecard
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Particulars</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Arpit Gola • Roll No: 2200270100045</h2>
          <p className="text-sm text-slate-600 mt-0.5">B.Tech Computer Science & Engineering • Semester 5 (2026–27)</p>
        </div>

        <div className="flex items-center space-x-4 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3.5">
          <Award className="w-8 h-8 text-indigo-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Semester SGPA</p>
            <p className="text-2xl font-extrabold text-indigo-700">{sgpa}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Subject Name</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Credits</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Total Marks</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Letter Grade</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Grade Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => (
              <tr key={course.code} className="hover:bg-slate-50/70">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900 font-mono">{course.code}</td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{course.name}</td>
                <td className="px-6 py-4 text-center text-sm text-slate-700">{course.credits}</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{course.total}</td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {course.grade}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-indigo-700">{course.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentResults;
