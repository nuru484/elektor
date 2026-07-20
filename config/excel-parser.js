const ExcelJS = require("exceljs");

// Reads voter rows from an uploaded .xlsx/.xls buffer using exceljs (replacing
// the vulnerable `xlsx` package). First row = headers; returns an array of
// objects keyed by header name, e.g. { firstName, lastName, voterId, phone_number }.
async function parseVotersBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const cellToString = (value) => {
    if (value === null || value === undefined) return "";
    // exceljs may return rich objects for formulas/hyperlinks/rich text.
    if (typeof value === "object") {
      if (value.text) return String(value.text).trim();
      if (value.result !== undefined) return String(value.result).trim();
      if (value.hyperlink) return String(value.hyperlink).trim();
      return "";
    }
    return String(value).trim();
  };

  let headers = [];
  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    // row.values is 1-indexed (index 0 is empty), which lines up with the
    // header array we build here, so the same index maps header -> cell.
    const values = row.values;

    if (rowNumber === 1) {
      headers = values.map((v) => cellToString(v));
      return;
    }

    const record = {};
    let hasData = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = cellToString(values[index]);
      record[header] = cell;
      if (cell) hasData = true;
    });

    if (hasData) {
      rows.push(record);
    }
  });

  return rows;
}

module.exports = { parseVotersBuffer };
