import { crawl } from './crawler.js';
import * as checks from './checks.js';
import { scoreFindings, summarize } from '../utils/severity.js';
import { saveScan, getScan } from '../config/store.js';

const cancelledScans = new Set();

export function cancelScan(scanId) {
  cancelledScans.add(scanId);
}

// Runs a full scan asynchronously and streams status into the store.
export async function runScan(scanId, targetUrl, options = {}) {
  const scan = await getScan(scanId);
  if (!scan) return;

  const update = async (patch) => {
    Object.assign(scan, patch);
    await saveScan(scan);
  };

  let lastProgressSave = 0;

  try {
    await update({ status: 'crawling', progress: 'Crawling site...' });

    const { pages, forms, scripts, pageCount } = await crawl(
      targetUrl,
      async (p) => {
        scan.progress = `Crawled ${p.crawled} page(s)...`;
        const now = Date.now();
        if (now - lastProgressSave > 1500) {
          lastProgressSave = now;
          await saveScan(scan);
        }
      },
      {
        ...options,
        shouldStop: () => cancelledScans.has(scanId),
      }
    );

    if (cancelledScans.has(scanId)) {
      cancelledScans.delete(scanId);
      await update({
        status: 'failed',
        progress: 'Scan stopped by user.',
        finished_at: new Date().toISOString(),
      });
      return;
    }

    if (pageCount === 0) {
      await update({
        status: 'failed',
        progress: 'Could not reach the target or no readable pages were found.',
        finished_at: new Date().toISOString(),
      });
      return;
    }

    await update({ status: 'scanning', progress: `Analysing ${pageCount} page(s)...` });

    const mainPage = pages[0];
    const findings = [];

    // Synchronous checks
    findings.push(...checks.checkSecurityHeaders(mainPage));
    findings.push(...checks.checkInfoDisclosure(mainPage));
    findings.push(...checks.checkCookies(pages));
    findings.push(...checks.checkDirectoryListing(pages));
    findings.push(...checks.checkForms(forms));
    findings.push(...checks.checkMixedContent(pages));
    findings.push(...checks.checkOutdatedLibraries(scripts));

    // Network checks run concurrently so slow endpoints don't stall the scan
    const [httpsFindings, exposedFindings, reflectedFindings] = await Promise.all([
      checks.checkHttps(targetUrl),
      checks.checkExposedPaths(targetUrl),
      checks.checkReflectedInput(pages),
    ]);
    findings.push(...httpsFindings, ...exposedFindings, ...reflectedFindings);

    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    const { score, grade } = scoreFindings(findings);
    const summary = summarize(findings);

    await update({
      status: 'completed',
      progress: 'Scan complete.',
      pages_crawled: pageCount,
      forms_found: forms.length,
      findings,
      summary,
      score,
      grade,
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scan error:', err);
    await update({
      status: 'failed',
      progress: `Error: ${err.message}`,
      finished_at: new Date().toISOString(),
    });
  } finally {
    cancelledScans.delete(scanId);
  }
}
