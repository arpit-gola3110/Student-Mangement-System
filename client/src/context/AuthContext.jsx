import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Demo mock user profiles for dev preview
  const demoUsers = {
    ADMIN: {
      id: 'demo-admin-id',
      email: 'admin@aktu.ac.in',
      role: 'ADMIN',
      profile: {
        firstName: 'Dr. Amitabh',
        lastName: 'Verma',
        department: { name: 'Dean Academics & Administration' }
      }
    },
    FACULTY: {
      id: 'demo-faculty-id',
      email: 'faculty@aktu.ac.in',
      role: 'FACULTY',
      profile: {
        employeeId: 'FAC-CSE-001',
        firstName: 'Dr. Rajesh',
        lastName: 'Sharma',
        designation: 'PROFESSOR',
        department: { name: 'Computer Science & Engineering' }
      }
    },
    STUDENT: {
      id: 'demo-student-id',
      email: 'student@aktu.ac.in',
      role: 'STUDENT',
      profile: {
        rollNumber: '2200270100045',
        enrollmentNumber: 'EN2200270100045',
        firstName: 'Arpit',
        lastName: 'Gola',
        currentSemester: 5,
        department: { name: 'Computer Science & Engineering' }
      }
    }
  };

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sms_user');
    return saved ? JSON.parse(saved) : demoUsers.ADMIN; // Default to Admin for immediate design preview
  });
  const [token, setToken] = useState(() => localStorage.getItem('sms_token') || 'demo_jwt_token_preview');
  const [loading, setLoading] = useState(false);

  // Switch role for UI preview purposes (as required by Phase 2 guidelines)
  const switchPreviewRole = (role) => {
    if (demoUsers[role]) {
      setUser(demoUsers[role]);
      localStorage.setItem('sms_user', JSON.stringify(demoUsers[role]));
    }
  };

  const login = async (email, password) => {
    // Determine demo role from email or password
    let selectedRole = 'STUDENT';
    if (email.includes('admin')) selectedRole = 'ADMIN';
    else if (email.includes('faculty')) selectedRole = 'FACULTY';

    const newUser = demoUsers[selectedRole];
    setUser(newUser);
    setToken('demo_jwt_token_preview');
    localStorage.setItem('sms_user', JSON.stringify(newUser));
    localStorage.setItem('sms_token', 'demo_jwt_token_preview');
    return newUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      switchPreviewRole,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
