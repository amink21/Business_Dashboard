import Papa from 'papaparse';

const TAB_CACHE_TTL = 5 * 60 * 1000;
let tabCache = { at: 0, spreadsheetId: null, tabs: null };

// Short names the pages ask for, so a tab rename is one env var rather than a
// code change.
function aliases() {
  return {
    print: process.env.SHEET_NAME || '3D Print Orders',
    tesla: process.env.TESLA_SHEET_NAME || 'Tesla Inventory',
    printSummary: process.env.PRINT_SUMMARY_SHEET_NAME || '3D Print Summary',
  };
}

// Google escapes non-ASCII and quotes inside the inline JS on the htmlview page.
function unescapeJs(s) {
  return s
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(["'\\])/g, '$1');
}

// Maps tab name -> gid by reading the public htmlview page. Needed because the CSV
// export endpoint addresses tabs by gid, not by name.
async function loadTabs(spreadsheetId) {
  const fresh =
    tabCache.tabs &&
    tabCache.spreadsheetId === spreadsheetId &&
    Date.now() - tabCache.at < TAB_CACHE_TTL;
  if (fresh) return tabCache.tabs;

  const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`);
  if (!res.ok) return null;

  const html = await res.text();
  const tabs = [];
  const re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?gid:\s*"(\d+)"/g;
  let m;
  while ((m = re.exec(html))) tabs.push({ name: unescapeJs(m[1]), gid: m[2] });
  if (!tabs.length) return null;

  tabCache = { at: Date.now(), spreadsheetId, tabs };
  return tabs;
}

// These tabs start with a merged title banner row ("3D PRINT ORDER TRACKER"), so
// the real header row is whichever first row has more than one filled cell.
function csvToObjects(csvText) {
  const { data } = Papa.parse(csvText, { skipEmptyLines: 'greedy' });
  const headerIdx = data.findIndex(
    (row) => row.filter((c) => String(c).trim()).length >= 2
  );
  if (headerIdx === -1) return [];

  const headers = data[headerIdx].map((h) => String(h).trim());
  return data
    .slice(headerIdx + 1)
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = (row[i] ?? '').trim();
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v !== ''));
}

export default async function handler(req, res) {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      return res.status(500).json({ error: 'Missing env var SPREADSHEET_ID.' });
    }

    const requested = String(req.query.tab || 'print');
    const sheetName = aliases()[requested] || requested;

    const tabs = await loadTabs(spreadsheetId);
    let url;

    if (tabs) {
      const tab = tabs.find(
        (t) => t.name.trim().toLowerCase() === sheetName.trim().toLowerCase()
      );
      if (!tab) {
        return res.status(404).json({
          error: `No tab named "${sheetName}" in this spreadsheet. Available tabs: ${tabs
            .map((t) => t.name)
            .join(', ')}.`,
        });
      }
      url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${tab.gid}`;
    } else {
      // Fallback: address the tab by name. Column headers can come back prefixed
      // with the title banner text, but the data still loads.
      url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheetName
      )}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Could not fetch sheet (status ${response.status}). Make sure sharing is set to "Anyone with the link -> Viewer".`
      );
    }

    const csvText = await response.text();

    // Google returns an HTML sign-in page instead of CSV when the sheet isn't shared.
    if (csvText.trim().startsWith('<')) {
      throw new Error(
        'Sheet did not return CSV data - check that it is shared as "Anyone with the link -> Viewer".'
      );
    }

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=59');

    // Summary tabs are laid out as labelled cells, not as a table with one header
    // row, so they come back as raw rows for the caller to look up by label.
    if (req.query.raw) {
      const { data } = Papa.parse(csvText, { skipEmptyLines: 'greedy' });
      return res.status(200).json({ rows: data });
    }

    res.status(200).json(csvToObjects(csvText));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
