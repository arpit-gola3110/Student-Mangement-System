import React, { useState } from 'react';
import { Bell, Pin, Calendar, Tag } from 'lucide-react';

export const AnnouncementList = () => {
  const [notices] = useState([
    {
      _id: '1',
      title: 'AKTU BCS 554 Mini Project Mid-Term Guide Evaluation',
      content: 'All 5th Semester B.Tech CSE scholars must present their Phase 1 & 2 progress logs and working software artifacts to their allotted faculty guides by Friday.',
      date: 'November 24, 2026',
      audience: 'ALL',
      isPinned: true
    },
    {
      _id: '2',
      title: '75% Mandatory Attendance Compliance Circular',
      content: 'In accordance with AKTU Ordinance Clause 3.2, scholars failing to maintain a cumulative attendance of 75% will be detained from appearing in end-semester examinations.',
      date: 'November 20, 2026',
      audience: 'STUDENTS',
      isPinned: false
    }
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Notice Board</h1>
        <p className="text-sm text-slate-500">Official Campus Notifications & Departmental Circulars</p>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <div
            key={notice._id}
            className={`bg-white rounded-xl border p-6 shadow-sm transition ${
              notice.isPinned ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {notice.isPinned && (
                  <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    <Pin className="w-3 h-3 mr-1" /> Pinned
                  </span>
                )}
                <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Tag className="w-3 h-3 mr-1" /> {notice.audience}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1" /> {notice.date}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-3">{notice.title}</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{notice.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementList;
