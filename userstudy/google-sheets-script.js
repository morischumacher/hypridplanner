/**
 * Google Apps Script - User Study Web App Endpoint
 * 
 * Paste this script into your Google Sheet's Apps Script editor:
 * 1. Open a Google Sheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any default code and paste this script.
 * 4. Click "Save" (disk icon).
 * 5. Click "Deploy" > "Manage deployments" > Edit (pencil icon) > choose "New version" > click "Deploy".
 *    (Or if deploying for the first time: "Deploy" > "New deployment" > "Web app" > set Access to "Anyone" > "Deploy").
 */

function doPost(e) {
  try {
    // Parse incoming JSON payload
    var payload = JSON.parse(e.postData.contents);
    
    // Open the Active Spreadsheet and sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Create headers if the sheet is empty
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Timestamp",
        "Participant ID",
        "Age",
        "Gender",
        "Major",
        "Semester",
        "Experience",
        "Total Time (min)",
        "Scenario A Time (min)",
        "Scenario B Time (min)",
        "Discovery Time (min)",
        "Scenario A Success",
        "Scenario A Difficulty",
        "Scenario A Satisfaction",
        "A: PU1 (Quickness)",
        "A: PU2 (Performance)",
        "A: PU3 (Usefulness)",
        "A: PEU1 (Clear/Understandable)",
        "A: PEU2 (Easy to Do)",
        "A: PEU3 (Easy to Learn)",
        "Scenario B Success",
        "Scenario B Difficulty",
        "Scenario B Satisfaction",
        "B: PU1 (Quickness)",
        "B: PU2 (Performance)",
        "B: PU3 (Usefulness)",
        "B: PEU1 (Clear/Understandable)",
        "B: PEU2 (Easy to Do)",
        "B: PEU3 (Easy to Learn)"
      ];
      for (var i = 1; i <= 26; i++) {
        headers.push("UEQ Item " + i);
      }
      headers.push("Interviewer Notes");
      headers.push("Raw JSON");
      
      sheet.appendRow(headers);
    }
    
    // Extract fields safely
    var demo = payload.demographics || {};
    var times = payload.timings || {};
    var aFeedback = payload.scenarioAFeedback || {};
    var bFeedback = payload.scenarioBFeedback || {};
    var ueq = payload.ueqEvaluation || {};
    var notes = payload.interviewerNotes || "";
    
    // Convert seconds to minutes for readability
    var toMin = function(sec) {
      return sec ? (sec / 60).toFixed(1) : "0.0";
    };
    
    // Format row values
    var rowData = [
      new Date(),
      demo.participantId || "unknown",
      demo.age || "",
      demo.gender || "",
      demo.major || "",
      demo.semester || "",
      demo.experience || "",
      toMin(times.totalSessionSeconds),
      toMin(times.scenarioASeconds),
      toMin(times.scenarioBSeconds),
      toMin(times.discoverySeconds),
      aFeedback.success || "",
      aFeedback.difficulty || "",
      aFeedback.satisfaction || "",
      aFeedback.pu1 || "",
      aFeedback.pu2 || "",
      aFeedback.pu3 || "",
      aFeedback.peu1 || "",
      aFeedback.peu2 || "",
      aFeedback.peu3 || "",
      bFeedback.success || "",
      bFeedback.difficulty || "",
      bFeedback.satisfaction || "",
      bFeedback.pu1 || "",
      bFeedback.pu2 || "",
      bFeedback.pu3 || "",
      bFeedback.peu1 || "",
      bFeedback.peu2 || "",
      bFeedback.peu3 || ""
    ];
    for (var i = 1; i <= 26; i++) {
      rowData.push(ueq["item" + i] || "");
    }
    rowData.push(notes);
    rowData.push(JSON.stringify(payload));
    
    // Append row to sheet
    sheet.appendRow(rowData);
    
    // Return success response to avoid CORS redirect complaints
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Results saved successfully!" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle preflight CORS requests from browser
function doOptions(e) {
  return ContentService.createTextOutput("")
                       .setMimeType(ContentService.MimeType.TEXT);
}
