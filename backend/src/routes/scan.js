import { Router } from 'express';
import { randomUUID } from 'crypto';
import { runScan, cancelScan } from '../services/scanner.js';
import { saveScan, getScan, listScans, deleteScan } from '../config/store.js';
import { normalizeUrl } from '../utils/http.js';
import { requireAuth } from '../utils/auth.js';

const router = Router();

// All scan operations require an authenticated user.
router.use(requireAuth);

// Start a new scan. Returns a scan id immediately; work continues in background.
router.post('/scan', async (req, res) => {
  const target = normalizeUrl(req.body?.url);
  if (!target) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  const mode = ['light', 'deep', 'custom'].includes(req.body?.mode) ? req.body.mode : 'deep';
  const maxPages =
    mode === 'light'
      ? 5
      : mode === 'custom'
        ? Math.max(1, Math.min(50, Number(req.body?.maxPages) || 15))
        : 25;
  const maxDepth =
    mode === 'light'
      ? 1
      : mode === 'custom'
        ? Math.max(0, Math.min(4, Number(req.body?.maxDepth) || 2))
        : 2;

  const scan = {
    id: randomUUID(),
    user_id: req.user.id,
    target_url: target,
    scan_mode: mode,
    status: 'queued',
    progress: 'Queued...',
    findings: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 },
    score: null,
    grade: null,
    pages_crawled: 0,
    forms_found: 0,
    created_at: new Date().toISOString(),
    finished_at: null,
  };

  await saveScan(scan);

  // Fire and forget — the client polls /scan/:id for progress.
  runScan(scan.id, target, { mode, maxPages, maxDepth });

  res.status(202).json({ id: scan.id, status: scan.status });
});

// Poll scan status / results
router.get('/scan/:id', async (req, res) => {
  const scan = await getScan(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.user_id && scan.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to view this scan.' });
  }
  res.json(scan);
});

// Stop an in-progress scan
router.post('/scan/:id/cancel', async (req, res) => {
  const scan = await getScan(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found.' });
  if (scan.user_id && scan.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to stop this scan.' });
  }
  cancelScan(req.params.id);
  res.json({ cancelling: true });
});

// Delete a scan
router.delete('/scan/:id', async (req, res) => {
  const result = await deleteScan(req.params.id, req.user.id);
  if (result === 'forbidden') {
    return res.status(403).json({ error: 'You do not have permission to delete this scan.' });
  }
  if (!result) return res.status(404).json({ error: 'Scan not found.' });
  res.json({ deleted: true });
});

// Recent scans for the signed-in user
router.get('/scans', async (req, res) => {
  const scans = await listScans(25, req.user.id);
  res.json(scans);
});

export default router;
