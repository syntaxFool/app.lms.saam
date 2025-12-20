// ========== CONFIGURATION ==========
const SHEET_ID = '1QyDwEBFR3fXve9lifuH9pdbDIyuLLC2RQrOmMYNMmII';
const SECRET_KEY = 'diffusion-bulginess-symphony';

// ========== ROLE LIMITS ==========
// Enforce maximum users per role:
// - Superuser: max 1 (system administrator)
// - Admin: max 5 (team managers)
// - Agent: max 10 (sales/support team)
// - User: unlimited
const ROLE_LIMITS = {
  superuser: 1,
  admin: 5,
  agent: 10,
  user: Infinity
};

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets(ss);
  
  let leads = readSheet(ss.getSheetByName('Leads'));
  const activities = readSheet(ss.getSheetByName('Activities'));
  const tasks = readSheet(ss.getSheetByName('Tasks'));
  const users = readSheet(ss.getSheetByName('Users'));
  const logs = readSheet(ss.getSheetByName('Logs'));
  const interests = readSheet(ss.getSheetByName('Interests'));
  
  // Support differential sync: if lastSyncTime is provided, only return changed leads
  const lastSyncTime = e && e.parameter && e.parameter.lastSyncTime ? parseInt(e.parameter.lastSyncTime) : 0;
  if (lastSyncTime > 0) {
    leads = leads.filter(lead => {
      if (!lead.updatedAt) return false; // Skip leads without updatedAt (shouldn't happen)
      const leadUpdateTime = new Date(lead.updatedAt).getTime();
      return leadUpdateTime > lastSyncTime;
    });
  }
  
  // Read Settings Sheet with dynamic column detection
  const settingsSheet = ss.getSheetByName('Settings');
  const settingsData = settingsSheet ? settingsSheet.getDataRange().getValues() : [];
  let locations = [];
  let sources = [];
  let taskTitles = [];
  let scriptUrl = '';
  let appTitle = '';
  
  if (settingsData.length > 0) {
    const headers = settingsData[0];
    const locationsCol = headers.indexOf('Locations');
    const sourcesCol = headers.indexOf('Sources');
    const scriptUrlCol = headers.indexOf('ScriptURL');
    const appTitleCol = headers.indexOf('AppTitle');
    const taskTitlesCol = headers.indexOf('TaskTitles');
    
    if (scriptUrlCol !== -1 && settingsData.length > 1) {
      scriptUrl = settingsData[1][scriptUrlCol] || '';
    }
    if (appTitleCol !== -1 && settingsData.length > 1) {
      appTitle = settingsData[1][appTitleCol] || '';
    }
    
    // Dynamically parse locations, sources, and task titles by column index
    for (let i = 1; i < settingsData.length; i++) {
      if (locationsCol !== -1 && settingsData[i][locationsCol]) locations.push(settingsData[i][locationsCol]);
      if (sourcesCol !== -1 && settingsData[i][sourcesCol]) sources.push(settingsData[i][sourcesCol]);
      if (taskTitlesCol !== -1 && settingsData[i][taskTitlesCol]) taskTitles.push(settingsData[i][taskTitlesCol]);
    }
  }

  // Re-nest activities and tasks using O(N) hash map approach instead of O(N*M)
  const activitiesMap = {};
  activities.forEach(a => {
    if (!activitiesMap[a.leadId]) activitiesMap[a.leadId] = [];
    activitiesMap[a.leadId].push(a);
  });
  
  const tasksMap = {};
  tasks.forEach(t => {
    if (!tasksMap[t.leadId]) tasksMap[t.leadId] = [];
    tasksMap[t.leadId].push(t);
  });
  
  leads.forEach(lead => {
    lead.activities = activitiesMap[lead.id] || [];
    lead.tasks = tasksMap[lead.id] || [];
    lead.value = parseFloat(lead.value) || 0;
  });

  const serverTime = new Date().getTime();
  const lastUpdate = parseInt(PropertiesService.getScriptProperties().getProperty('LAST_UPDATE') || 0);

  const output = JSON.stringify({
    leads: leads,
    users: users,
    logs: logs,
    interests: interests,
    settings: { locations: locations, sources: sources, taskTitles: taskTitles, scriptUrl: scriptUrl },
    config: { appTitle: appTitle },
    serverTime: serverTime,
    lastUpdate: lastUpdate
  });

  return createCORSResponse(output);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets(ss);
  
  // Use LockService to prevent race conditions during concurrent writes
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return createCORSResponse(JSON.stringify({ 
      success: false,
      error: 'Server busy. Please try again.' 
    }));
  }
  
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Handle authentication requests
    if (data.function === 'authenticateUser') {
      const credentials = data.parameters[0];
      const result = authenticateUser(ss, credentials);
      return createCORSResponse(JSON.stringify(result));
    }
    
    // Handle token validation
    if (data.function === 'validateToken') {
      const tokenData = data.parameters[0];
      const result = validateToken(ss, tokenData);
      return createCORSResponse(JSON.stringify(result));
    }
    
    // Handle profile update
    if (data.function === 'updateUserProfile') {
      const profileData = data.parameters[0];
      const result = updateUserProfile(ss, profileData);
      return createCORSResponse(JSON.stringify(result));
    }
    
    // Handle logout
    if (data.function === 'logoutUser') {
      const userData = data.parameters[0];
      const result = logoutUser(ss, userData);
      return createCORSResponse(JSON.stringify(result));
    }
    
    if (data.action === 'save_all') {
      if(data.users) {
        // Validate role limits before saving users
        const validation = validateUserRoleLimits(data.users);
        if (!validation.success) {
          return createCORSResponse(JSON.stringify({ 
            success: false, 
            error: validation.message,
            violations: validation.violations 
          }));
        }
        writeSheet(ss.getSheetByName('Users'), data.users, ['id', 'username', 'password', 'name', 'role']);
      }
      if(data.logs) writeSheet(ss.getSheetByName('Logs'), data.logs, ['id', 'timestamp', 'message']);
      
      if(data.leads) {
        const flatLeads = data.leads.map(l => {
          const { activities, tasks, ...rest } = l; 
          return rest;
        });
        
        const flatActivities = [];
        const flatTasks = [];
        data.leads.forEach(l => {
          if (l.activities && Array.isArray(l.activities)) {
            l.activities.forEach(a => flatActivities.push({ ...a, leadId: l.id }));
          }
          if (l.tasks && Array.isArray(l.tasks)) {
            l.tasks.forEach(t => flatTasks.push({ ...t, leadId: l.id }));
          }
        });

        writeSheet(ss.getSheetByName('Leads'), flatLeads, ['id', 'name', 'phone', 'email', 'status', 'value', 'interest', 'location', 'source', 'assignedTo', 'notes', 'temperature', 'lostReason', 'createdAt', 'updatedAt', 'lastModified', 'lastModifiedBy']);
        writeSheet(ss.getSheetByName('Activities'), flatActivities, ['id', 'leadId', 'type', 'note', 'timestamp', 'createdBy', 'role']);
        writeSheet(ss.getSheetByName('Tasks'), flatTasks, ['id', 'leadId', 'title', 'status', 'dueDate', 'note', 'createdAt', 'completedAt']);
      }
      
      // Update the LAST_UPDATE timestamp after successful save
      updateLastModified();
      
      return createCORSResponse(JSON.stringify({ status: 'success' }));
    }
    // New: Save ScriptURL and AppName to Settings
    if (data.action === 'save_script_url' && (data.scriptUrl || data.appTitle)) {
      const settingsSheet = ss.getSheetByName('Settings');
      let settingsData = settingsSheet.getDataRange().getValues();
      // Ensure header row
      if (settingsData.length === 0) {
        settingsSheet.appendRow(['Locations', 'Sources', 'ScriptURL', 'AppTitle']);
        settingsData = settingsSheet.getDataRange().getValues();
      }
      // Find ScriptURL and AppTitle columns
      const headers = settingsData[0];
      let scriptUrlCol = headers.indexOf('ScriptURL');
      let appTitleCol = headers.indexOf('AppTitle');
      if (scriptUrlCol === -1) {
        scriptUrlCol = headers.length;
        headers.push('ScriptURL');
      }
      if (appTitleCol === -1) {
        appTitleCol = headers.length;
        headers.push('AppTitle');
      }
      settingsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Ensure at least one data row
      if (settingsData.length < 2) {
        const row = [];
        for (let i = 0; i < headers.length; i++) row.push('');
        settingsSheet.appendRow(row);
        settingsData = settingsSheet.getDataRange().getValues();
      }
      // Set ScriptURL and AppTitle values
      if (data.scriptUrl) settingsSheet.getRange(2, scriptUrlCol + 1).setValue(data.scriptUrl);
      if (data.appTitle) settingsSheet.getRange(2, appTitleCol + 1).setValue(data.appTitle);
      
      // Update the LAST_UPDATE timestamp
      updateLastModified();
      
      return createCORSResponse(JSON.stringify({ status: 'success' }));
    }
  } catch (error) {
    return createCORSResponse(JSON.stringify({ status: 'error', message: error.toString() }));
  } finally {
    lock.releaseLock();
  }
}

// --- Helpers ---
function setupSheets(ss) {
  const sheets = ['Leads', 'Activities', 'Tasks', 'Users', 'Logs', 'Interests', 'Settings'];
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

function updateLastModified() {
  PropertiesService.getScriptProperties().setProperty('LAST_UPDATE', new Date().getTime().toString());
}

// ========== ROLE LIMIT FUNCTIONS ==========

/**
 * Get count of users by role
 * @param {Array} users - Array of user objects
 * @returns {Object} - Count of users per role
 */
function getRoleStats(users) {
  const stats = {
    superuser: 0,
    admin: 0,
    agent: 0,
    user: 0
  };
  
  users.forEach(u => {
    const role = u.role || 'user';
    if (stats.hasOwnProperty(role)) {
      stats[role]++;
    }
  });
  
  return stats;
}

/**
 * Check if a new user can be created with the given role
 * @param {string} role - The role to assign to the new user
 * @param {Array} users - Array of existing users
 * @returns {Object} - { allowed: boolean, message: string, current: number, limit: number }
 */
function checkRoleLimits(role, users) {
  const stats = getRoleStats(users);
  const limit = ROLE_LIMITS[role] || Infinity;
  const current = stats[role] || 0;
  
  if (current >= limit) {
    const messages = {
      superuser: `Maximum 1 superuser allowed. Current: ${current}/1`,
      admin: `Maximum 5 admins allowed. Current: ${current}/5`,
      agent: `Maximum 10 agents allowed. Current: ${current}/10`,
      user: `User accounts cannot exceed system limits. Current: ${current}`
    };
    
    return {
      allowed: false,
      message: messages[role] || `Maximum ${limit} ${role}s allowed`,
      current: current,
      limit: limit
    };
  }
  
  const remaining = limit - current;
  return {
    allowed: true,
    message: `${remaining} slot${remaining === 1 ? '' : 's'} remaining for ${role}s`,
    current: current,
    limit: limit,
    remaining: remaining
  };
}

/**
 * Get formatted role limits display
 * @param {Array} users - Array of users
 * @returns {string} - Formatted string like "Superuser: 0/1 | Admins: 3/5 | Agents: 8/10"
 */
function getRoleLimitsDisplay(users) {
  const stats = getRoleStats(users);
  return [
    `Superuser: ${stats.superuser}/${ROLE_LIMITS.superuser}`,
    `Admins: ${stats.admin}/${ROLE_LIMITS.admin}`,
    `Agents: ${stats.agent}/${ROLE_LIMITS.agent}`
  ].join(' | ');
}

function createCORSResponse(jsonString) {
  const response = ContentService.createTextOutput(jsonString);
  response.setMimeType(ContentService.MimeType.JSON);
  // CORS headers are handled by Netlify proxy, not needed here
  return response;
}

// ========== USER VALIDATION ==========

/**
 * Validate that users array respects role limits
 * @param {Array} users - Array of user objects to validate
 * @returns {Object} - { success: boolean, message?: string, violations?: Array }
 */
function validateUserRoleLimits(users) {
  if (!Array.isArray(users)) {
    return { success: false, message: 'Users must be an array' };
  }
  
  const stats = getRoleStats(users);
  const violations = [];
  
  // Check each role against its limit
  Object.keys(stats).forEach(role => {
    const count = stats[role];
    const limit = ROLE_LIMITS[role];
    
    if (count > limit) {
      violations.push({
        role: role,
        current: count,
        limit: limit,
        message: `Too many ${role}s: ${count} > ${limit}`
      });
    }
  });
  
  if (violations.length > 0) {
    const violationMessages = violations.map(v => v.message).join('; ');
    return {
      success: false,
      message: `Role limit violation: ${violationMessages}`,
      violations: violations
    };
  }
  
  return { success: true };
}

// ========== AUTHENTICATION FUNCTIONS ==========

function authenticateUser(ss, credentials) {
  try {
    const { uid, password } = credentials;
    
    if (!uid || !password) {
      return { success: false, error: 'UID and password required' };
    }
    
    // Get users from sheet
    const usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) {
      return { success: false, error: 'Users sheet not found' };
    }
    
    const users = readSheet(usersSheet);
    
    // Find user - check multiple possible column names
    let user = null;
    for (let i = 0; i < users.length; i++) {
      const currentUser = users[i];
      const userUsername = currentUser.username || currentUser.uid || currentUser.UID;
      const userPassword = String(currentUser.password || currentUser.Password); // Convert to string for comparison
      
      if (userUsername === uid && userPassword.trim() === password.trim()) {
        user = {
          id: currentUser.id || Utilities.getUuid(),
          name: currentUser.name || currentUser.username || uid,
          email: uid,
          role: currentUser.role || 'user',
          picture: 'https://via.placeholder.com/50'
        };
        break;
      }
    }
    
    if (!user) {
      return { success: false, error: 'Invalid UID or password' };
    }
    
    // Create JWT token
    const token = createJWT(user);
    
    return {
      success: true,
      data: {
        user,
        token
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validateToken(ss, tokenData) {
  try {
    const { token } = tokenData;
    
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    // Verify JWT (simplified)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { success: false, error: 'Invalid token' };
    }
    
    try {
      const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tokenParts[1])).getDataAsString());
      
      // Check expiration
      if (payload.exp && payload.exp < (new Date().getTime() / 1000)) {
        return { success: false, error: 'Token expired' };
      }
      
      return {
        success: true,
        data: payload.user
      };
    } catch (e) {
      return { success: false, error: 'Invalid token format' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function updateUserProfile(ss, profileData) {
  try {
    const { user, updates } = profileData;
    
    const usersSheet = ss.getSheetByName('Users');
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find user row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user.id) {
        // Update fields
        if (updates.name) {
          const nameCol = headers.indexOf('name');
          if (nameCol !== -1) data[i][nameCol] = updates.name;
        }
        
        usersSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        
        return {
          success: true,
          data: { ...user, ...updates }
        };
      }
    }
    
    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function logoutUser(ss, userData) {
  try {
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function createJWT(user) {
  try {
    // Generate a simple session token (UUID-based)
    // In production, use proper JWT with signing
    const token = Utilities.getUuid() + '_' + new Date().getTime();
    return token;
  } catch (error) {
    console.log('Error creating token:', error);
    return Utilities.getUuid(); // Fallback
  }
}

// ========== INITIALIZATION FUNCTION ==========

function initializeSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create all required sheets
    const sheetNames = ['Leads', 'Activities', 'Tasks', 'Users', 'Logs', 'Interests', 'Settings'];
    
    sheetNames.forEach(name => {
      if (!ss.getSheetByName(name)) {
        ss.insertSheet(name);
      }
    });
    
    // Initialize Users sheet (empty - no demo data)
    const usersSheet = ss.getSheetByName('Users');
    if (usersSheet.getLastRow() === 0) {
      usersSheet.appendRow(['id', 'username', 'password', 'name', 'role']);
    }
    
    // Initialize Leads sheet
    const leadsSheet = ss.getSheetByName('Leads');
    if (leadsSheet.getLastRow() === 0) {
      leadsSheet.appendRow(['id', 'name', 'email', 'phone', 'location', 'source', 'status', 'value', 'createdAt', 'updatedAt']);
    }
    
    // Initialize Activities sheet
    const activitiesSheet = ss.getSheetByName('Activities');
    if (activitiesSheet.getLastRow() === 0) {
      activitiesSheet.appendRow(['id', 'leadId', 'type', 'description', 'timestamp']);
    }
    
    // Initialize Tasks sheet
    const tasksSheet = ss.getSheetByName('Tasks');
    if (tasksSheet.getLastRow() === 0) {
      tasksSheet.appendRow(['id', 'leadId', 'title', 'status', 'dueDate', 'createdAt']);
    }
    
    // Initialize Logs sheet
    const logsSheet = ss.getSheetByName('Logs');
    if (logsSheet.getLastRow() === 0) {
      logsSheet.appendRow(['id', 'timestamp', 'message']);
    }
    
    // Initialize Interests sheet
    const interestsSheet = ss.getSheetByName('Interests');
    if (interestsSheet.getLastRow() === 0) {
      interestsSheet.appendRow(['id', 'name', 'category']);
    }
    
    // Initialize Settings sheet (empty - no demo data)
    const settingsSheet = ss.getSheetByName('Settings');
    if (settingsSheet.getLastRow() === 0) {
      settingsSheet.appendRow(['Locations', 'Sources', 'TaskTitles', 'ScriptURL', 'AppTitle']);
      settingsSheet.appendRow(['', '', '', '', 'Shanuzz Academy LMS']);
    }
    
    Logger.log('Database initialized successfully!');
  } catch (error) {
    Logger.log('Error initializing sheets: ' + error.message);
  }
}