/**
 * @fileoverview Spreadsheet database service for PolicyPlayBook.
 * Handles CRUD operations with basic caching.
 */

const SPREADSHEET_ID = '1wpvqOVfNuVaUBUQxYn45qNTSHG4dNbAJAwhOigu8p_U';

/**
 * Database service for spreadsheet CRUD operations.
 */
class Database {
  /**
   * Creates a Database service instance.
   */
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  /**
   * Retrieves a sheet by name.
   * @param {string} name - Sheet name.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet instance.
   * @throws {Error} If sheet not found.
   */
  getSheet(name) {
    const sheet = this.spreadsheet.getSheetByName(name);
    if (!sheet) {
      throw new Error('Sheet not found: ' + name);
    }
    return sheet;
  }

  /**
   * Reads all active records from the specified sheet.
   * @param {string} sheetName - Sheet name.
   * @returns {Object[]} Array of records.
   */
  readAll(sheetName) {
    const cacheKey = `sheet_${sheetName}`;
    const cached = Cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const sheet = this.getSheet(sheetName);
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const records = values
      .filter((row) => row.join('').length)
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });
    Cache.put(cacheKey, records, 3600);
    return records;
  }

  /**
   * Finds a record by key column value.
   * @param {string} sheetName - Sheet name.
   * @param {string} keyColumn - Column name to match.
   * @param {string} value - Value to match.
   * @returns {Object|null} Matching record or null.
   */
  find(sheetName, keyColumn, value) {
    return this.readAll(sheetName).find((r) => String(r[keyColumn]) === String(value)) || null;
  }

  /**
   * Inserts a record into the sheet.
   * @param {string} sheetName - Sheet name.
   * @param {Object} record - Record object.
   * @returns {Object} Inserted record.
   */
  insert(sheetName, record) {
    const sheet = this.getSheet(sheetName);
    const headers = sheet.getDataRange().getValues()[0];
    const row = headers.map((h) => (record[h] !== undefined ? record[h] : ''));
    sheet.appendRow(row);
    Cache.invalidate(`sheet_${sheetName}`);
    return record;
  }

  /**
   * Updates a record in the sheet.
   * @param {string} sheetName - Sheet name.
   * @param {string} keyColumn - Key column name.
   * @param {string} value - Key value to match.
   * @param {Object} record - Fields to update.
   * @returns {boolean} True if updated, false if not found.
   */
  update(sheetName, keyColumn, value, record) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyIndex = headers.indexOf(keyColumn);
    if (keyIndex === -1) {
      throw new Error('Key column not found: ' + keyColumn);
    }
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyIndex]) === String(value)) {
        headers.forEach((h, idx) => {
          if (record[h] !== undefined) {
            sheet.getRange(i + 1, idx + 1).setValue(record[h]);
          }
        });
        Cache.invalidate(`sheet_${sheetName}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Performs a logical delete by setting is_active to FALSE.
   * @param {string} sheetName - Sheet name.
   * @param {string} keyColumn - Key column name.
   * @param {string} value - Key value.
   * @returns {boolean} True if updated.
   */
  remove(sheetName, keyColumn, value) {
    return this.update(sheetName, keyColumn, value, { is_active: false });
  }
}

if (typeof module !== 'undefined') {
  module.exports = Database;
}
