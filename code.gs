function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets(ss);
  
  const leads = readSheet(ss.getSheetByName('Leads'));
  const activities = readSheet(ss.getSheetByName('Activities'));
  const users = readSheet(ss.getSheetByName('Users'));
  const logs = readSheet(ss.getSheetByName('Logs'));
  const interests = readSheet(ss.getSheetByName('Interests'));
  
  // NEW: Read Settings Sheet (Col 1 = Location, Col 2 = Source)
  const settingsSheet = ss.getSheetByName('Settings');
  const settingsData = settingsSheet ? settingsSheet.getDataRange().getValues() : [];
  
  // Extract columns ignoring the header row
  let locations = [];
  let sources = [];
  
  if (settingsData.length > 1) {
    // Assuming Row 1 is headers
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0]) locations.push(settingsData[i][0]); // Col 1
      if (settingsData[i][1]) sources.push(settingsData[i][1]);   // Col 2
    }
  }

  // Re-nest activities
  leads.forEach(lead => {
    lead.activities = activities.filter(a => a.leadId === lead.id).map(a => a);
    lead.value = parseFloat(lead.value) || 0;
  });

  return ContentService.createTextOutput(JSON.stringify({
    leads: leads,
    users: users,
    logs: logs,
    interests: interests,
    settings: { locations: locations, sources: sources } // Send lists to frontend
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets(ss);
  
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'save_all') {
      if(data.users) writeSheet(ss.getSheetByName('Users'), data.users, ['id', 'username', 'password', 'name', 'role']);
      if(data.logs) writeSheet(ss.getSheetByName('Logs'), data.logs, ['id', 'timestamp', 'message']);
      
      if(data.leads) {
        const flatLeads = data.leads.map(l => {
          const { activities, ...rest } = l; 
          return rest;
        });
        
        const flatActivities = [];
        data.leads.forEach(l => {
          if (l.activities && Array.isArray(l.activities)) {
            l.activities.forEach(a => flatActivities.push({ ...a, leadId: l.id }));
          }
        });

        writeSheet(ss.getSheetByName('Leads'), flatLeads, ['id', 'name', 'phone', 'email', 'status', 'value', 'interest', 'location', 'source', 'assignedTo', 'notes', 'createdAt']);
        writeSheet(ss.getSheetByName('Activities'), flatActivities, ['id', 'leadId', 'type', 'note', 'timestamp', 'createdBy', 'role']);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Helpers ---
function setupSheets(ss) {
  const sheets = ['Leads', 'Activities', 'Users', 'Logs', 'Interests', 'Settings'];
  sheets.forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
}

function readSheet(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function writeSheet(sheet, data, headers) {
  sheet.clearContents();
  if (data.length === 0) {
    sheet.appendRow(headers);
    return;
  }
  const output = [headers];
  data.forEach(item => {
    const row = headers.map(h => {
      const val = item[h];
      return val === undefined || val === null ? '' : val;
    });
    output.push(row);
  });
  sheet.getRange(1, 1, output.length, headers.length).setValues(output);
}