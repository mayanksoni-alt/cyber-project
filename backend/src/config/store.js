import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import supabase, { isSupabaseEnabled } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Hybrid storage layer: uses Supabase when configured, and falls back to an
// in-memory Map persisted to backend/data/store.json so accounts and scan
// history survive local server restarts.

const scanMemory = new Map();
const userMemory = new Map(); // keyed by user.id

function loadLocalStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.users)) {
      for (const u of parsed.users) userMemory.set(u.id, u);
    }
    if (Array.isArray(parsed.scans)) {
      for (const s of parsed.scans) scanMemory.set(s.id, s);
    }
  } catch (err) {
    console.warn('Could not load local store:', err.message);
  }
}

function persistLocalStore() {
  if (isSupabaseEnabled()) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = {
      users: [...userMemory.values()],
      scans: [...scanMemory.values()].slice(0, 200),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist local store:', err.message);
  }
}

loadLocalStore();

/* -------------------- Users -------------------- */

export async function createUser(user) {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw new Error(error.message);
    userMemory.set(data.id, data);
    return data;
  }
  userMemory.set(user.id, user);
  persistLocalStore();
  return user;
}

export async function findUserByEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  for (const u of userMemory.values()) {
    if (u.email === normalized) return u;
  }

  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();
    if (error) {
      console.error('Supabase findUserByEmail error:', error.message);
      return null;
    }
    if (data) userMemory.set(data.id, data);
    return data;
  }
  return null;
}

export async function findUserById(id) {
  if (userMemory.has(id)) return userMemory.get(id);

  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Supabase findUserById error:', error.message);
      return null;
    }
    if (data) userMemory.set(data.id, data);
    return data;
  }
  return null;
}

export async function updateUser(id, patch) {
  const existing = await findUserById(id);
  if (!existing) return null;

  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };

  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    userMemory.set(id, data);
    return data;
  }

  userMemory.set(id, updated);
  persistLocalStore();
  return updated;
}

/* -------------------- Scans -------------------- */

export async function saveScan(scan) {
  if (isSupabaseEnabled()) {
    const { error } = await supabase.from('scans').upsert(scan);
    if (error) console.error('Supabase saveScan error:', error.message);
  }
  scanMemory.set(scan.id, scan);
  persistLocalStore();
  return scan;
}

export async function getScan(id) {
  if (scanMemory.has(id)) return scanMemory.get(id);

  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Supabase getScan error:', error.message);
      return null;
    }
    if (data) scanMemory.set(data.id, data);
    return data;
  }
  return null;
}

export async function listScans(limit = 20, userId = null) {
  if (isSupabaseEnabled()) {
    let query = supabase
      .from('scans')
      .select('id, user_id, target_url, scan_mode, status, score, grade, pages_crawled, forms_found, created_at, summary')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase listScans error:', error.message);
      return [];
    }
    return data;
  }

  let items = [...scanMemory.values()];
  if (userId) {
    items = items.filter((s) => s.user_id === userId);
  }

  return items
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map(({ id, user_id, target_url, scan_mode, status, score, grade, pages_crawled, forms_found, created_at, summary }) => ({
      id,
      user_id: user_id || null,
      target_url,
      scan_mode: scan_mode || 'deep',
      status,
      score,
      grade,
      pages_crawled,
      forms_found,
      created_at,
      summary,
    }));
}

export async function deleteScan(id, userId = null) {
  const existing = await getScan(id);
  if (!existing) return false;
  if (existing.user_id && existing.user_id !== userId) {
    return 'forbidden';
  }

  if (isSupabaseEnabled()) {
    const { error } = await supabase.from('scans').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteScan error:', error.message);
      return false;
    }
  }

  scanMemory.delete(id);
  persistLocalStore();
  return true;
}

export async function getUserStats(userId) {
  const scans = await listScans(100, userId);
  const completed = scans.filter((s) => s.status === 'completed' && typeof s.score === 'number');
  const avgScore = completed.length
    ? Math.round(completed.reduce((acc, s) => acc + s.score, 0) / completed.length)
    : null;
  const totalIssues = completed.reduce((acc, s) => acc + (s.summary?.total || 0), 0);
  const criticalIssues = completed.reduce((acc, s) => acc + (s.summary?.critical || 0), 0);

  return {
    totalScans: scans.length,
    completedScans: completed.length,
    avgScore,
    totalIssues,
    criticalIssues,
  };
}
