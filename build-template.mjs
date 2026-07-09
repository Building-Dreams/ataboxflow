import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/inbox-template";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Inbox Upload");
sheet.showGridLines = false;

const headers = [
  "Aanvraagnr",
  "Aansluitnr",
  "Dienst",
  "Mutatie",
  "Internet nummer",
  "Naam debiteur",
  "Aangeslotene",
  "Naam aangeslotene",
  "Adres",
  "Status",
  "Contractor",
  "Processtap",
  "Laatste gebruiker",
  "Laatste wijziging",
  "Soort Aanvraag",
  "Aanvraagdatum",
  "Aansluitadres",
  "IP adress",
  "IP adress extra",
  "Aansluitnummer/Voice 1",
  "Password 1",
  "Aansluitnummer/Voice 2",
  "Password 2",
  "Aansluitnummer/Voice 3",
  "Password 3",
  "Aansluitnummer/Voice 4",
  "Password 4",
  "Aansluitnummer/Voice 5",
  "Password 5",
  "Nieuw Aansluitnummer",
  "Opmerking"
];

const exampleRow = [
  "2020134577",
  "424000",
  "TEL",
  new Date("2000-02-16"),
  "BB424000",
  "UN PATOE/LEE ON O I",
  "170333565",
  "UN PATOE/LEE ON O I",
  "MAAGDENSTR 2",
  "Nieuw",
  "",
  "",
  "planner",
  new Date("2026-07-07"),
  "MIG",
  new Date("2000-02-16"),
  "HARRY WEG 18 - PONTBUITEN - KWEEKI - WANICA",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
];

sheet.getRange("A1:AE1").values = [headers];
sheet.getRange("A2:AE2").values = [exampleRow];
sheet.getRange("A3:AE25").values = Array.from({ length: 23 }, () => headers.map(() => ""));

sheet.getRange("A1:AE1").format = {
  fill: "#1F5094",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true
};
sheet.getRange("A2:AE25").format = {
  fill: "#F7F9FC",
  borders: { preset: "all", style: "thin", color: "#D7DDE6" }
};
sheet.getRange("A1:AE25").format.borders = { preset: "all", style: "thin", color: "#C8D2E1" };
sheet.getRange("D2:D25").setNumberFormat("yyyy-mm-dd");
sheet.getRange("N2:N25").setNumberFormat("yyyy-mm-dd");
sheet.getRange("P2:P25").setNumberFormat("yyyy-mm-dd");
sheet.getRange("A:AE").format.autofitColumns();
sheet.getRange("A1:AE1").format.rowHeightPx = 36;
sheet.freezePanes.freezeRows(1);

const table = sheet.tables.add("A1:AE25", true, "InboxUploadTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const statusRange = sheet.getRange("J2:J25");
statusRange.dataValidation = { rule: { type: "list", values: ["Nieuw", "In behandeling", "Afgehandeld"] } };
const contractorRange = sheet.getRange("K2:K25");
contractorRange.dataValidation = { rule: { type: "list", values: ["SETI NV", "OX88", "ANTS", "QCT", "TQRT"] } };
const processRange = sheet.getRange("L2:L25");
processRange.dataValidation = {
  rule: {
    type: "list",
    values: [
      "Survey",
      "Installatie",
      "ATA-box invoeren",
      "REST nummers opheffen",
      "Bulk file opmaken",
      "ATA-box configureren",
      "ATA-box install (contractor)",
      "Afronding & registratie (Excel file)"
    ]
  }
};
const soortRange = sheet.getRange("O2:O25");
soortRange.dataValidation = { rule: { type: "list", values: ["MIG"] } };
const aansluitnummerRange = sheet.getRange("AD2:AD25");
aansluitnummerRange.dataValidation = {
  rule: { type: "list", values: ["DATA-SUR", "I&P", "CONTRACTOR", "BRM", "NOM", "IBS"] }
};

const instructions = workbook.worksheets.add("Uitleg");
instructions.showGridLines = false;
instructions.getRange("A1:D1").merge();
instructions.getRange("A1").values = [["Inbox upload template"]];
instructions.getRange("A1").format = {
  fill: "#1F5094",
  font: { bold: true, color: "#FFFFFF", size: 14 }
};
instructions.getRange("A3:D9").values = [
  ["Gebruik", "Vul de regels in op de tab 'Inbox Upload' en upload dit bestand via de knop Excel uploaden.", "", ""],
  ["Belangrijk", "Laat de kolomnamen op rij 1 ongewijzigd, anders kan de import sommige velden niet herkennen.", "", ""],
  ["Internet nummer", "Mag leeg blijven; de applicatie toont automatisch BB + Aansluitnr.", "", ""],
  ["Datums", "Gebruik bij voorkeur yyyy-mm-dd, bijvoorbeeld 2026-07-07.", "", ""],
  ["Aansluitnummer dropdown", "Gebruik DATA-SUR, I&P, CONTRACTOR, BRM, NOM of IBS.", "", ""],
  ["Processtap", "Als Contractor is gevuld en Processtap leeg is, start de app automatisch bij Survey.", "", ""],
  ["Extra nummers", "De Voice/Password velden mogen leeg blijven en kunnen later in het formulier worden ingevuld.", "", ""]
];
instructions.getRange("A3:A9").format = { font: { bold: true }, fill: "#E8F1FF" };
instructions.getRange("A3:D9").format.borders = { preset: "all", style: "thin", color: "#D7DDE6" };
instructions.getRange("A:D").format.autofitColumns();

const inspect = await workbook.inspect({
  kind: "table",
  range: "Inbox Upload!A1:AE3",
  include: "values,formulas",
  tableMaxRows: 3,
  tableMaxCols: 31,
  maxChars: 5000
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Inbox Upload",
  range: "A1:L8",
  scale: 1,
  format: "png"
});
await fs.writeFile(`${outputDir}/inbox-upload-template-preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/inbox-upload-template.xlsx`);
