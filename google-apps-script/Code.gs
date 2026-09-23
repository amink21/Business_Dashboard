/**
 * Write endpoint for the Hustle Desk dashboard.
 *
 * Paste this over everything in Code.gs, set TOKEN below, then deploy:
 *   Deploy -> New deployment -> Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the /exec URL into APPS_SCRIPT_URL in the site's environment.
 *
 * "Anyone" is required because the site's server calls this without a Google
 * login. TOKEN is what actually protects it, so treat that string like a
 * password: it is the only thing standing between the open internet and your
 * sheet. Change it from the default before deploying.
 *
 * Every redeploy makes a NEW /exec URL unless you choose "Manage deployments"
 * and edit the existing one. Editing keeps the URL stable.
 *
 * Editing this file is not enough on its own: the web app serves the last
 * DEPLOYED version, so after changing TOKEN you must deploy again (Manage
 * deployments -> edit -> Version: New version) or the old token stays live.
 */

const SHEET_ID = '1EYbvKH3QeEaMUcD2BQgAmtbQH_tvPIfgVMUxuoQIKA8';
const ORDERS_TAB = '3D Print Orders';
// Letters and digits only. A $ in the token gets expanded away by .env parsing
// on the site's side, and a # can start a comment - either silently produces a
// token mismatch that looks like a deployment problem.
const TOKEN = 'change-me-to-a-long-random-alphanumeric-string';

// Only these can be written into the Status column.
const ALLOWED_STATUSES = [
  'Need to Print',
  'Printed',
  'Waiting for Pickup',
  'Completed',
  'Cancelled',
];

function doGet(e) {
  return handle(e);
}

function doPost(e) {
  return handle(e);
}

function handle(e) {
  try {
    const p = readParams(e);

    if (p.token !== TOKEN) {
      return json({ error: 'Unauthorized' });
    }

    switch (p.action) {
      case 'ping':
        return json({ ok: true, tab: ORDERS_TAB, statuses: ALLOWED_STATUSES });
      case 'updateStatus':
        return json(updateStatus(p.orderId, p.status));
      case 'createOrder':
        return json(createOrder(p));
      default:
        return json({ error: 'Unknown action: ' + (p.action || '(none)') });
    }
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
  }
}

// Accepts params from the query string or from a JSON body, so it works whether
// the caller POSTs JSON or just appends ?action=... to the URL.
function readParams(e) {
  const out = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) {
      out[k] = e.parameter[k];
    });
  }
  if (e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      Object.keys(body).forEach(function (k) {
        out[k] = body[k];
      });
    } catch (err) {
      // not JSON - the query string is all we have
    }
  }
  return out;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// The tab opens with a merged title banner, so the header row is the first row
// with more than one filled cell - the same rule the site's reader uses.
function findHeaderRow(values) {
  for (let i = 0; i < values.length; i += 1) {
    const filled = values[i].filter(function (c) {
      return String(c).trim() !== '';
    });
    if (filled.length >= 2) return i;
  }
  return -1;
}

function columnMap(headerRow) {
  const map = {};
  headerRow.forEach(function (h, i) {
    const name = String(h).trim();
    if (name) map[name] = i;
  });
  return map;
}

function updateStatus(orderId, status) {
  if (!orderId) return { error: 'Missing orderId' };
  if (ALLOWED_STATUSES.indexOf(status) === -1) {
    return { error: 'Status must be one of: ' + ALLOWED_STATUSES.join(', ') };
  }

  // Two people hitting "Complete" at once would otherwise interleave reads and
  // writes on the same row.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ORDERS_TAB);
    if (!sheet) return { error: 'Tab "' + ORDERS_TAB + '" not found' };

    const range = sheet.getDataRange();
    const values = range.getValues();
    const headerIdx = findHeaderRow(values);
    if (headerIdx === -1) return { error: 'Could not find a header row' };

    const cols = columnMap(values[headerIdx]);
    if (cols['Order ID'] === undefined || cols.Status === undefined) {
      return { error: 'Sheet is missing an "Order ID" or "Status" column' };
    }

    let rowIdx = -1;
    for (let i = headerIdx + 1; i < values.length; i += 1) {
      if (String(values[i][cols['Order ID']]).trim() === String(orderId).trim()) {
        rowIdx = i;
        break;
      }
    }
    if (rowIdx === -1) return { error: 'No order with id ' + orderId };

    const sheetRow = rowIdx + 1; // getValues is 0-based, the sheet is 1-based
    sheet.getRange(sheetRow, cols.Status + 1).setValue(status);

    const filled = fillMoneyIfNeeded(sheet, sheetRow, cols, values[rowIdx], status);

    SpreadsheetApp.flush();

    return {
      ok: true,
      orderId: orderId,
      status: status,
      row: sheetRow,
      filled: filled,
    };
  } finally {
    lock.releaseLock();
  }
}

// Appends a new row from the Quote screen's "Add to queue" - always as a fresh
// "Need to Print" job. Column positions come from columnMap, same as
// updateStatus, so this keeps working if a column gets reordered by hand.
function createOrder(p) {
  const item = String(p.item || '').trim();
  if (!item) return { error: 'Missing item' };
  const hours = toNumber(p.hours);
  if (!hours) return { error: 'Missing hours' };
  const sale = toNumber(p.salePrice);
  if (!sale) return { error: 'Missing salePrice' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ORDERS_TAB);
    if (!sheet) return { error: 'Tab "' + ORDERS_TAB + '" not found' };

    const range = sheet.getDataRange();
    const values = range.getValues();
    const headerIdx = findHeaderRow(values);
    if (headerIdx === -1) return { error: 'Could not find a header row' };

    const cols = columnMap(values[headerIdx]);
    if (cols['Order ID'] === undefined) return { error: 'Sheet is missing an "Order ID" column' };

    // One past the highest existing P-#### id, so a manual sheet entry made
    // between two writes never collides with a generated one.
    let maxN = 0;
    for (let i = headerIdx + 1; i < values.length; i += 1) {
      const m = /^P-(\d+)$/.exec(String(values[i][cols['Order ID']] || ''));
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    const orderId = 'P-' + String(maxN + 1).padStart(4, '0');

    const row = new Array(values[headerIdx].length).fill('');
    const set = function (name, value) {
      if (cols[name] !== undefined) row[cols[name]] = value;
    };
    set('Order ID', orderId);
    set('Order Date', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    set('Item / Model', item);
    set('Qty', 1);
    set('Print Hrs', hours);
    set('Material Cost', toNumber(p.materialCost));
    set('Total Cost', toNumber(p.totalCost));
    set('Sale Price', sale);
    set('Status', 'Need to Print');
    set('Platform', 'Quote');

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();

    return { ok: true, orderId: orderId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Profit and Margin are blank until an order closes. On completion, fill them -
 * but only when the cell is genuinely empty AND holds no formula. If the sheet
 * already computes those columns, writing a literal would silently destroy the
 * formula, so this leaves them alone and lets the sheet do its job.
 */
function fillMoneyIfNeeded(sheet, sheetRow, cols, rowValues, status) {
  if (status !== 'Completed') return [];
  if (cols.Profit === undefined) return [];

  const sale = toNumber(rowValues[cols['Sale Price']]);
  const cost = toNumber(rowValues[cols['Total Cost']]);
  if (!sale) return [];

  const filled = [];

  const profitCell = sheet.getRange(sheetRow, cols.Profit + 1);
  if (String(rowValues[cols.Profit]).trim() === '' && profitCell.getFormula() === '') {
    profitCell.setValue(sale - cost);
    filled.push('Profit');
  }

  if (cols['Margin %'] !== undefined) {
    const marginCell = sheet.getRange(sheetRow, cols['Margin %'] + 1);
    if (String(rowValues[cols['Margin %']]).trim() === '' && marginCell.getFormula() === '') {
      marginCell.setValue(((sale - cost) / sale) * 100 / 100);
      marginCell.setNumberFormat('0.0%');
      filled.push('Margin %');
    }
  }

  return filled;
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
