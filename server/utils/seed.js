import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
import Announcement from '../models/Announcement.js';

dotenv.config();

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_mdc_db';
  try {
    console.log(`[Seed] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seed] Connected to database successfully!');

    // Clear existing
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Course.deleteMany({}),
      Semester.deleteMany({}),
      Subject.deleteMany({}),
      Faculty.deleteMany({}),
      Student.deleteMany({}),
      FacultyAssignment.deleteMany({}),
      Announcement.deleteMany({})
    ]);

    console.log('[Seed] Cleaned existing collections');

    // 1. Admin User
    const adminUser = await User.create({
      email: 'admin@aktu.ac.in',
      password: 'AdminPassword@123',
      role: 'ADMIN'
    });
    console.log('[Seed] Admin user created: admin@aktu.ac.in');

    // 2. Department
    const cseDept = await Department.create({
      code: 'CSE',
      name: 'Computer Science & Engineering',
      description: 'Department of Computer Science and Engineering, AKTU'
    });

    // 3. Course
    const btechCse = await Course.create({
      code: 'BTECH-CSE',
      name: 'Bachelor of Technology in Computer Science & Engineering',
      department: cseDept._id,
      durationYears: 4,
      totalSemesters: 8
    });

    // 4. Semester
    const sem5 = await Semester.create({
      course: btechCse._id,
      semesterNumber: 5,
      academicYear: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-15'),
      status: 'ACTIVE'
    });

    // 5. Subjects
    const miniProject = await Subject.create({
      code: 'BCS-554',
      name: 'Internship Assessment / Mini Project',
      course: btechCse._id,
      semester: sem5._id,
      credits: 2,
      type: 'PROJECT'
    });

    const webDev = await Subject.create({
      code: 'BCS-501',
      name: 'Database Management Systems',
      course: btechCse._id,
      semester: sem5._id,
      credits: 4,
      type: 'THEORY'
    });

    // 6. Faculty
    const facultyUser = await User.create({
      email: 'faculty@aktu.ac.in',
      password: 'FacultyPassword@123',
      role: 'FACULTY'
    });

    const faculty = await Faculty.create({
      user: facultyUser._id,
      employeeId: 'FAC-CSE-001',
      firstName: 'Dr. Rajesh',
      lastName: 'Sharma',
      department: cseDept._id,
      designation: 'PROFESSOR',
      qualification: 'Ph.D. in Computer Science',
      contactNumber: '9876543210'
    });

    // Assign faculty to BCS-554 and BCS-501
    await FacultyAssignment.create({
      faculty: faculty._id,
      subject: miniProject._id,
      semester: sem5._id,
      section: 'A',
      academicYear: '2026-2027'
    });

    // 7. Student
    const studentUser = await User.create({
      email: 'student@aktu.ac.in',
      password: 'StudentPassword@123',
      role: 'STUDENT'
    });

    const student = await Student.create({
      user: studentUser._id,
      rollNumber: '2200270100045',
      enrollmentNumber: 'EN2200270100045',
      firstName: 'Arpit',
      lastName: 'Gola',
      dateOfBirth: new Date('2004-05-15'),
      gender: 'MALE',
      department: cseDept._id,
      contactNumber: '9123456789',
      address: 'Lucknow, Uttar Pradesh',
      currentSemester: 5,
      status: 'ACTIVE'
    });

    // 8. Welcome Announcement
    await Announcement.create({
      title: 'Welcome to the New Academic Session 2026–27',
      content: 'Classes and Mini Project (BCS 554) evaluations commence according to the AKTU academic calendar. Please ensure regular attendance above 75%.',
      author: adminUser._id,
      targetAudience: 'ALL',
      isPinned: true
    });

    console.log('\n[Seed Success] Database successfully seeded with demo accounts:');
    console.log('   Admin: admin@aktu.ac.in / AdminPassword@123');
    console.log('   Faculty: faculty@aktu.ac.in / FacultyPassword@123');
    console.log('   Student: student@aktu.ac.in / StudentPassword@123\n');

    process.exit(0);
  } catch (err) {
    console.error('\n' + '='.repeat(70));
    console.error('[SEED SCRIPT ERROR] Could not connect to MongoDB database.');
    console.error(`Target URI: ${uri}`);
    console.error(`Reason: ${err.message}`);
    console.error('='.repeat(70));
    console.error('\nTo fix this:');
    console.error('Option 1 (Recommended): Put your free MongoDB Atlas connection string in server/.env');
    console.error('  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/student_mdc_db?retryWrites=true&w=majority\n');
    console.error('Option 2: Install MongoDB Community Server locally on Windows and start the service:');
    console.error('  https://www.mongodb.com/try/download/community\n');
    process.exit(1);
  }
};

seed();
