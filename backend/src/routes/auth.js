import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  getUserStats,
} from '../config/store.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  sanitizeUser,
} from '../utils/auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const organization = String(req.body?.organization || '').trim();

    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name,
      email,
      organization: organization || 'Independent Researcher',
      role: 'Security Analyst',
      password_hash: hashPassword(password),
      created_at: now,
      updated_at: now,
      last_login_at: now,
    };

    await createUser(user);

    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err?.message ? `Could not create account: ${err.message}` : 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!EMAIL_RE.test(email) || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const updated = await updateUser(user.id, { last_login_at: new Date().toISOString() });
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.json({ token, user: sanitizeUser(updated || user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Account not found.' });
  }
  const stats = await getUserStats(user.id);
  res.json({ user: sanitizeUser(user), stats });
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const patch = {};
    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters.' });
      }
      patch.name = name;
    }
    if (req.body?.organization !== undefined) {
      patch.organization = String(req.body.organization).trim() || 'Independent Researcher';
    }
    if (req.body?.role !== undefined) {
      patch.role = String(req.body.role).trim() || 'Security Analyst';
    }
    if (req.body?.newPassword) {
      const current = String(req.body?.currentPassword || '');
      const nextPw = String(req.body.newPassword);
      if (!verifyPassword(current, user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (nextPw.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      }
      patch.password_hash = hashPassword(nextPw);
    }

    const updated = await updateUser(user.id, patch);
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

export default router;
