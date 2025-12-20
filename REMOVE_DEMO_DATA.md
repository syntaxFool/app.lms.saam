# Update Google Apps Script - Remove Demo Data

## Overview
The demo data has been removed from the initialization. You need to update your Google Apps Script deployment with the new code.

## Steps to Update

### 1. Open Google Apps Script
1. Go to [Google Apps Script Console](https://script.google.com/)
2. Open your existing project (Shanuzz Academy LMS)

### 2. Update the Code
1. Select all existing code in the editor
2. Delete it
3. Copy the entire content from the updated `code.gs` file
4. Paste it into the Apps Script editor

### 3. Save and Deploy
1. Click **File** → **Save** (or Ctrl+S)
2. Click **Deploy** → **Manage deployments**
3. Click the **Edit** icon (pencil) next to your existing deployment
4. Set **Version** to "New version"
5. Click **Deploy**

### 4. Clear Existing Data (Optional)
If you want to completely reset the sheets:

1. In your Google Sheet, delete all data except headers from:
   - Users sheet
   - Leads sheet  
   - Activities sheet
   - Tasks sheet
   - Settings sheet (keep the app title if desired)

### 5. Test the Connection
1. Go to https://app-lms-saam.netlify.app
2. The system should now start with clean data
3. Create your first admin user account

## What Changed

### ❌ Removed Demo Data:
- Demo superuser account `nox1` / `1233`
- Sample locations: "New York", "Los Angeles", "Chicago"
- Sample sources: "Facebook", "Google", "LinkedIn" 
- Sample task titles: "Follow up", "Call", "Email"

### ✅ Clean Initialization:
- Empty Users sheet (headers only)
- Empty Settings sheet (only app title preserved)
- All other sheets initialize with headers only
- System ready for production use

## Next Steps

1. **Create Admin Account**: Register your first user through the application
2. **Configure Settings**: Add your locations, sources, and task titles via the UI
3. **Start Clean**: Begin with fresh data for production use

## Security Note
The removal of demo credentials means the system is more secure by default. You'll need to create real user accounts for access.