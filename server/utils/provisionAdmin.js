import dotenv from 'dotenv';
import readline from 'readline';
import connectDB, { closeDatabase } from '../config/db.js';
import User from '../models/User.js';
import { passwordPolicySchema } from '../validators/authValidator.js';
import { z } from 'zod';

dotenv.config();

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

const promptInput = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

/**
 * Controlled Admin Provisioning Utility.
 * Accepts CLI args (--email=..., --password=...), env vars (ADMIN_EMAIL / ADMIN_PASSWORD),
 * or interactive prompt in development. Never hardcodes credentials.
 */
const provisionAdmin = async () => {
  try {
    await connectDB();

    const args = Object.fromEntries(
      process.argv
        .slice(2)
        .filter((arg) => arg.startsWith('--') && arg.includes('='))
        .map((arg) => {
          const [key, ...rest] = arg.slice(2).split('=');
          return [key, rest.join('=')];
        })
    );

    const rawEmail = args.email || process.env.ADMIN_EMAIL || (await promptInput('Admin Email: '));
    const rawPassword = args.password || process.env.ADMIN_PASSWORD || (await promptInput('Admin Password: '));

    const parsedEmail = emailSchema.safeParse(rawEmail);
    if (!parsedEmail.success) {
      throw new Error(parsedEmail.error.errors[0].message);
    }

    const parsedPassword = passwordPolicySchema.safeParse(rawPassword);
    if (!parsedPassword.success) {
      throw new Error(`Password policy failed: ${parsedPassword.error.errors.map((e) => e.message).join('; ')}`);
    }

    const email = parsedEmail.data;
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error(`A user account with email '${email}' already exists.`);
    }

    const adminUser = await User.create({
      email,
      password: parsedPassword.data,
      role: 'admin',
      isActive: true
    });

    console.log(`[Provisioning] Admin account created successfully: ${adminUser.email} (role: ${adminUser.role})`);
    await closeDatabase();
    process.exit(0);
  } catch (err) {
    console.error('[Provisioning Error]', err.message);
    await closeDatabase();
    process.exit(1);
  }
};

provisionAdmin();
