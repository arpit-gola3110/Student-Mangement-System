import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Building2, Plus, Users, BookOpen } from 'lucide-react';

export const DepartmentList = () => {
  const [departments, setDepartments] = useState([
    { _id: '1', code: 'CSE', name: 'Computer Science & Engineering', description: 'Curriculum focused on software engineering, AI, and systems.' },
    { _id: '2', code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Signal processing, telecommunications, and VLSI.' },
    { _id: '3', code: 'ME', name: 'Mechanical Engineering', description: 'Thermodynamics, robotics, and manufacturing.' },
    { _id: '4', code: 'CE', name: 'Civil Engineering', description: 'Structural engineering, geodesy, and environmental systems.' }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Departments</h1>
          <p className="text-sm text-slate-500">Institutional Faculty Hierarchy & Organizational Divisions</p>
        </div>

        <button
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div key={dept.code} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-mono">
                {dept.code}
              </span>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-3">{dept.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{dept.description}</p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 18 Faculty Members</span>
              <span className="flex items-center"><BookOpen className="w-3.5 h-3.5 mr-1" /> 4 Degree Programs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentList;
