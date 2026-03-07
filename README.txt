═══════════════════════════════════════════════════════════
MRK FOODS — SETUP GUIDE (Read top to bottom, do once only)
═══════════════════════════════════════════════════════════

WHAT THIS SYSTEM DOES:
  Admin adds/edits manager → Saves to cloud → Customer scans
  QR → Sees live data instantly. No GitHub push ever needed.

═══════════════════════════════════════════════════════════
STEP 1 — CREATE FREE CLOUD DATABASE (5 minutes, one time)
═══════════════════════════════════════════════════════════

1. Open https://jsonbin.io in your browser
2. Click "Sign Up Free" → create account (use your email)
3. After login, click the blue "+ CREATE BIN" button
4. In the editor, delete everything and paste exactly this:
   {"managers":[]}
5. Click "CREATE" button
6. Look at the browser URL bar — it will look like:
   https://jsonbin.io/app/bins/67abc123e41b4d34e4XXXXX
   Copy only the ID part: 67abc123e41b4d34e4XXXXX
   → This is your BIN_ID

7. In the left menu, click "API KEYS"
8. Click "+ CREATE ACCESS KEY"
9. Name it anything (e.g. "MRK Key") → Click CREATE
10. Copy the full key shown (starts with $2b$...)
    → This is your API_KEY

═══════════════════════════════════════════════════════════
STEP 2 — EDIT config.js (20 seconds)
═══════════════════════════════════════════════════════════

Open config.js and replace:
  'PASTE_BIN_ID_HERE'  → your BIN_ID from step above
  'PASTE_API_KEY_HERE' → your API_KEY from step above
  'MRK@2026'           → your own admin password

Save the file.

═══════════════════════════════════════════════════════════
STEP 3 — UPLOAD ALL 5 FILES TO GITHUB
═══════════════════════════════════════════════════════════

Files to upload:
  index.html   ← Customer landing page (NO admin link)
  admin.html   ← Your private admin panel
  style.css    ← Styles
  script.js    ← All logic
  config.js    ← Your settings (already filled in)

DO NOT upload README.txt to GitHub.

═══════════════════════════════════════════════════════════
STEP 4 — DEPLOY ON VERCEL
═══════════════════════════════════════════════════════════

1. Go to vercel.com → New Project → Import from GitHub
2. Deploy → get your URL (e.g. https://m-rk-foods-qr-code.vercel.app)

═══════════════════════════════════════════════════════════
STEP 5 — ADD YOUR SEED MANAGERS
═══════════════════════════════════════════════════════════

1. Open https://yoursite.vercel.app/admin.html
2. Password: whatever you set in config.js
3. Click "Add Manager" tab
4. Fill in all details for each manager → "Add & Sync Live"
5. Repeat for all 4 managers

After adding, your customers can scan the QR immediately.

═══════════════════════════════════════════════════════════
HOW TO USE DAILY
═══════════════════════════════════════════════════════════

Change a manager's card URL or phone:
  → Open admin.html → Edit ✏️ → Update → Save & Sync Live
  → Customer's page updates in 3 seconds. Done.

Add a new city manager:
  → Open admin.html → Add Manager → Fill form → Add & Sync Live

Remove a manager:
  → Open admin.html → 🗑️ Delete → Confirm

Mark unavailable (on leave etc):
  → Click "Available" toggle → turns to "Coming Soon"

Generate/print QR Code:
  → admin.html → QR Code tab → Enter your Vercel URL → Generate → Download PNG
  → QR NEVER changes. Print once, use forever.

═══════════════════════════════════════════════════════════
CUSTOMER PAGE vs ADMIN PAGE
═══════════════════════════════════════════════════════════

Customer page: yoursite.vercel.app/index.html
  ✅ Shows all managers
  ✅ Call, WhatsApp, Save Contact, View Card buttons
  ❌ NO admin link visible
  ❌ CANNOT edit anything

Admin page: yoursite.vercel.app/admin.html
  🔐 Password protected
  ✅ Add / Edit / Delete managers
  ✅ Toggle availability
  ✅ Generate & download QR code
  ✅ Changes go live in 3 seconds worldwide

═══════════════════════════════════════════════════════════
