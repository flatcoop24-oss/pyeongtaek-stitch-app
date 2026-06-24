const SPREADSHEET_ID = "1upsnbzUH8sF3fKMpA_Twa_R4AEkN35DAs3xmG8xW3nQ";
const SHEETS = {
  reservation: {
    name: "신청",
    headers: ["접수번호", "접수일시", "이름", "연락처", "이메일", "인원", "희망회차", "채집하고싶은것"]
  },
  review: {
    name: "후기",
    headers: ["후기번호", "접수일시", "이름", "참여회차", "공개여부", "후기"]
  }
};

function setupSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEETS).forEach((kind) => {
    const spec = SHEETS[kind];
    const sheet = spreadsheet.getSheetByName(spec.name) || spreadsheet.insertSheet(spec.name);
    sheet.clear();
    sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
    sheet.setFrozenRows(1);
  });
}

function doPost(event) {
  const kind = normalizeKind(event.parameter.kind);
  const payload = JSON.parse(event.parameter.payload || "{}");
  const sheet = getSheet(kind);
  sheet.appendRow(toRow(kind, payload));
  return json({ ok: true });
}

function doGet(event) {
  const kind = normalizeKind(event.parameter.kind || "reservation");
  if (event.parameter.format === "csv") {
    return csv(getSheet(kind).getDataRange().getValues());
  }
  return json({ ok: true, kind: kind });
}

function normalizeKind(kind) {
  const value = String(kind || "").toLowerCase();
  return value === "review" || value === "reviews" ? "review" : "reservation";
}

function getSheet(kind) {
  const spec = SHEETS[kind];
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(spec.name) || spreadsheet.insertSheet(spec.name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toRow(kind, payload) {
  if (kind === "review") {
    return [payload.id, payload.createdAt, payload.name, payload.session, payload.public ? "공개" : "비공개", payload.message];
  }
  return [payload.id, payload.createdAt, payload.name, payload.phone, payload.email, payload.people, payload.session, payload.wish];
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function csv(values) {
  const text = values.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.CSV);
}
