# Data.json Update Guide

## ✅ What Has Been Updated

Your `data.json` now contains **12 schools** (reduced from the backup):

### Schools in data.json:
- **LGA Code 1** (lCode: 1420256700): 10 schools
  - ADAMS PRIMARY SCHOOL, ISSELE-UKU
  - ANAGBA PRIMARY SCHOOL, OBOMKPA
  - ANIEMEKE PRIMARY SCHOOL, ONICHA-UGBO
  - ANIUGO PRIMARY SCHOOL, ANIOFU
  - AZAGBA PRIMARY SCHOOL, ISSELE-AZAGBA
  - AZANOBA PRIMARY SCHOOL, UBULUBU
  - BURR PRIMARY SCHOOL I, ISSELE-UKU
  - DIEI PRIMARY SCHOOL, IDUMU-OGO
  - EGBUNE PRIMARY SCHOOL, ISSELE-UKU
  - EKO PRIMARY SCHOOL I, UKWU-NZU

- **LGA Code 2** (lCode: 660742704): 2 schools
  - DAUGHTERS OF DIVINE LOVE NUR/PRY SCHOOL, UBULU-UKU
  - DIVINE LOVE NUR/PRY SCHOOL, OGWASHI-UKU

---

## 🔄 Next Steps

### 1. Restart Development Server

The following files import `data.json` statically and need a server restart to reload:

- `app/api/school/signup/route.ts` - validates schools during signup
- `app/api/school/login/route.ts` - validates schools during login  
- `app/api/access/verify/route.ts` - validates access codes
- `app/(public)/school-registration/page.tsx` - displays school list

**To restart:**
```bash
# Stop any running dev servers, then:
npm run dev
```

### 2. Sync Database (When Database is Accessible)

Your database may contain schools that are no longer in `data.json`. Run the sync script to check:

```bash
# Check what needs to be synced
npm run sync-db

# If there are orphaned schools (in DB but not in JSON), remove them:
npm run sync-db -- --remove-orphaned

# If there are name mismatches, update them:
npm run sync-db -- --update-names
```

**Note:** The sync script requires database connectivity. If you see a database connection error, ensure your DATABASE_URL in `.env` is correct and the database is accessible.

---

## 📝 Files That Were Updated

### Created:
1. **`scripts/sync-database-with-json.ts`** - Database sync utility
   - Checks for orphaned schools in database
   - Identifies name mismatches
   - Can remove orphaned schools
   - Can update school names to match data.json

2. **`package.json`** - Added `sync-db` script command

3. **`DATA_SYNC_GUIDE.md`** - This guide

### Installed:
- **tsx** - TypeScript execution engine for running sync scripts

---

## 🎯 What Each Component Does

### Static Imports (Need Server Restart)
These files directly import data.json and cache it:
- Signup/Login APIs use it to validate school credentials
- Registration page uses it to populate school dropdowns

### Dynamic File Operations (Already Updated)
These APIs read data.json from disk on each request:
- `app/api/admin/data-json/route.ts` - Already reads fresh data
- `app/api/admin/data-json/bulk/route.ts` - Already reads fresh data
- Admin UI at `/admin/data-json` - Already shows updated data

### Database (Needs Manual Sync)
- The `School` table in your database stores registered schools
- Schools in the database should match schools in data.json
- Use the sync script to align them

---

## 🚨 Important Notes

1. **Static imports are cached** until the Node.js process restarts
2. **Database records persist** independently of data.json updates
3. **School validation** during signup/login uses data.json as the source of truth
4. If a school is removed from data.json but remains in the database, it won't be able to log in but existing registrations remain
5. Consider backing up your database before removing orphaned schools

---

## 🔍 Verification

After restarting the server and syncing the database:

1. Visit `/admin/data-json` to verify the admin UI shows 12 schools
2. Try registering with a school code from your updated data.json
3. Check that old school codes no longer work for new signups
4. Run `npm run sync-db` to verify no orphaned schools remain

---

## 📞 Troubleshooting

**Database connection errors:**
- Check your `.env` file has correct `DATABASE_URL`
- Ensure your database service (Neon) is running
- Verify network connectivity

**Changes not reflecting:**
- Make sure you've restarted the dev server
- Clear browser cache for the application
- Check console for any import errors

**Orphaned data concerns:**
- The sync script shows you what will be deleted before removing anything
- Student registrations linked to removed schools will also be deleted (cascade delete)
- Consider exporting data before cleanup if needed
