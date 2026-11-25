import { crawl } from './crawler.js';
import * as checks from './checks.js';
import { scoreFindings, summarize } from '../utils/severity.js';
import { saveScan, getScan } from '../config/store.js';

// Runs a full scan asynchronously and streams status into the store.
export async function runScan(scanId, targetUrl, options = {}) {
  const scan = await getScan(scanId);

  const update = async (patch) => {
    Object.assign(scan, patch);
    await saveScan(scan);
  };

  try {
    await update({ status: 'crawling', progress: 'Crawling site...' });

    const { pages, forms, scripts, pageCount } = await crawl(
      targetUrl,
      (p) => {
        scan.progress = `Crawled ${p.crawled} page(s)...`;
      },
      options
    );

    if (pageCount === 0) {
      await update({
        status: 'failed',
        progress: 'Could not reach the target or no pages were readable.',
        finished_at: new Date().toISOString(),
      });
      return;
    }

    await update({ status: 'scanning', progress: `Analysing ${pageCount} page(s)...` });

    const mainPage = pages[0];
    const findings = [];

    // Run all detection checks
    findings.push(...checks.checkSecurityHeaders(mainPage));
    findings.push(...checks.checkInfoDisclosure(mainPage));
    findings.push(...checks.checkCookies(pages));
    findings.push(...(await checks.checkHttps(targetUrl)));
    findings.push(...(await checks.checkExposedPaths(targetUrl)));
    findings.push(...checks.checkDirectoryListing(pages));
    findings.push(...checks.checkForms(forms));
    findings.push(...checks.checkMixedContent(pages));
    findings.push(...checks.checkOutdatedLibraries(scripts));
    findings.push(...(await checks.checkReflectedInput(pages)));

    // Order by severity for display
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
  }
}
