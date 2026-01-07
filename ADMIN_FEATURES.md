# Admin & Result Upload Features - Implementation Guide

## Overview
This document outlines all the new features added to the admin panel and result upload system based on the requirements.

## Database Schema Updates

### Result Model
- **rgstype** (String?): Religious type field (IRS/CRS) to properly classify religious studies results
- **blocked** (Boolean): Block status for individual student results

### School Model
- **blocked** (Boolean): Block status for schools
- **religiousClassification** (String?): Religious classification (Christian/Muslim)

### SchoolData Model
- **blocked** (Boolean): Block status for school data records

## CSV Upload Enhancement

### New Column: RGSTYPE
The result upload CSV now includes the `RGSTYPE` column to properly categorize religious studies.

**Updated CSV Format:**
```
SESSIONYR, FNAME, MNAME, LNAME, SEXCD, INSTITUTIONCD, SCHOOLNAME, LGACD, EXAMINATIONNO, ENG, ENGGRD, ARIT, ARITGRD, GP, GPGRD, RGS, RGSGRD, RGSTYPE, REMARK, ACCCESS_PIN
```

**RGSTYPE Values:**
- `IRS` - Islamic Religious Studies
- `CRS` - Christian Religious Studies

The system now processes this field and ensures IRS and CRS are correctly reflected on students' results.

## Admin Functionalities

### 1. Counting Features

#### Count LGAs
- **Endpoint:** `GET /api/admin/count?type=lga`
- **Description:** Returns the total number of unique Local Government Areas
- **Response:**
  ```json
  {
    "count": 25,
    "lgas": ["01", "02", "03", ...]
  }
  ```

#### Count Schools by LGA
- **Endpoint:** `GET /api/admin/count?type=schools-by-lga&lga=<lgaCode>`
- **Description:** Returns the number of schools in a specific LGA
- **Response:**
  ```json
  {
    "lgaCode": "01",
    "count": 15
  }
  ```

#### Count All Schools by LGA
- **Endpoint:** `GET /api/admin/count?type=all-schools-by-lga`
- **Description:** Returns school counts for all LGAs
- **Response:**
  ```json
  [
    { "lgaCode": "01", "count": 15 },
    { "lgaCode": "02", "count": 20 }
  ]
  ```

### 2. Delete Operations

#### Delete a School
- **Endpoint:** `DELETE /api/admin/delete`
- **Body:**
  ```json
  {
    "type": "school",
    "id": "school_id_here"
  }
  ```
- **Description:** Permanently deletes a school and all associated student registrations (cascading delete)

#### Delete a Student
- **Endpoint:** `DELETE /api/admin/delete`
- **Body:**
  ```json
  {
    "type": "student",
    "examNumber": "12345678"
  }
  ```
- **Description:** Deletes a student by their examination number from results or registrations

#### Delete an LGA
- **Endpoint:** `DELETE /api/admin/delete`
- **Body:**
  ```json
  {
    "type": "lga",
    "lgaCode": "01"
  }
  ```
- **Description:** **CRITICAL OPERATION** - Deletes all schools, students, and data for the specified LGA
- **Warning:** This action cannot be undone!

### 3. Blocking Operations

#### Block/Unblock a School
- **Endpoint:** `POST /api/admin/block`
- **Body:**
  ```json
  {
    "type": "school",
    "id": "school_id_here",
    "blocked": true
  }
  ```
- **Description:** Block or unblock a school from accessing the system

#### Block/Unblock a Student
- **Endpoint:** `POST /api/admin/block`
- **Body:**
  ```json
  {
    "type": "student",
    "examNumber": "12345678",
    "blocked": true
  }
  ```
- **Description:** Block or unblock a student's result access

#### Block/Unblock an LGA
- **Endpoint:** `POST /api/admin/block`
- **Body:**
  ```json
  {
    "type": "lga",
    "lgaCode": "01",
    "blocked": true
  }
  ```
- **Description:** Block or unblock all schools in a specific LGA

### 4. School Religious Classification

#### Set/Update Classification
- **Endpoint:** `POST /api/admin/school-classification`
- **Body:**
  ```json
  {
    "schoolId": "school_id_here",
    "classification": "Christian"
  }
  ```
- **Options:** "Christian", "Muslim", or null
- **Description:** Set or change a school's religious classification

#### Get Classification
- **Endpoint:** `GET /api/admin/school-classification?schoolId=<id>`
- **Description:** Retrieve a school's current religious classification

## Admin UI Features

### Management Console (`/admin/manage`)
A comprehensive management interface with four main tabs:

#### 1. Count Tab
- View total number of LGAs
- See schools count per LGA
- Real-time statistics display

#### 2. Delete Tab
- Delete schools by ID
- Delete students by examination number
- Delete entire LGAs (with confirmation)
- All operations have confirmation dialogs

#### 3. Block Tab
- Block/unblock schools by ID
- Block/unblock students by examination number
- Block/unblock all schools in an LGA
- Visual indication of block status

#### 4. Classify Tab
- Set school religious classification
- Options: Christian, Muslim, or None
- Easy dropdown selection

### Enhanced Schools Page (`/admin/schools`)
Updated to include:
- **Blocked Status Badge:** Visual indicator showing if a school is blocked
- **Religious Classification Column:** Displays the school's religious type
- **Block/Unblock Button:** Quick action to toggle block status
- **Classification Button:** Dialog to update religious classification
- All existing features (PIN generation, registration toggle, delete) remain

## Security & Best Practices

### Rate Limiting
All APIs are protected with rate limiting:
- Read operations: 100 requests per 15 minutes
- Mutation operations: 50 requests per 15 minutes
- Admin operations: 30 requests per 15 minutes

### Validation
- All inputs are validated on both frontend and backend
- Type checking ensures data integrity
- Confirmation dialogs prevent accidental deletions

### Cascading Operations
- Deleting a school automatically removes associated students
- Deleting an LGA removes all schools and their students
- Block status is properly propagated

## Migration Instructions

### Database Migration
The schema has been updated using Prisma. To apply changes:

```bash
# Push schema changes to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name add_admin_features
```

### Testing the Features

1. **Test CSV Upload with RGSTYPE:**
   - Navigate to `/admin/add-result`
   - Upload a CSV with the new RGSTYPE column
   - Verify IRS/CRS values are correctly stored

2. **Test Counting:**
   - Go to `/admin/manage` → Count tab
   - Check LGA counts and schools per LGA

3. **Test Blocking:**
   - Go to `/admin/manage` → Block tab or `/admin/schools`
   - Block a school and verify access is restricted
   - Unblock and verify access is restored

4. **Test Classification:**
   - Go to `/admin/schools`
   - Click the Church icon on any school
   - Set classification and verify it's saved

5. **Test Deletion:**
   - Go to `/admin/manage` → Delete tab
   - Test with non-critical data first
   - Verify cascading deletions work properly

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/count` | GET | Count LGAs and schools |
| `/api/admin/delete` | DELETE | Delete schools, students, or LGAs |
| `/api/admin/block` | POST | Block/unblock entities |
| `/api/admin/school-classification` | POST/GET | Manage school religious classification |
| `/api/results/bulk` | POST | Upload results CSV with RGSTYPE |

## Important Notes

1. **Backup Before Deleting:** Always backup your database before performing delete operations, especially for LGAs
2. **RGSTYPE is Optional:** The CSV processing handles both old format (without RGSTYPE) and new format
3. **Block vs Delete:** Use blocking to temporarily restrict access; use deletion only when data should be permanently removed
4. **Cache Invalidation:** School operations automatically invalidate relevant caches
5. **TypeScript Errors:** After schema updates, restart your TypeScript server if you see type errors

## Troubleshooting

### Issue: TypeScript errors about 'blocked' or 'religiousClassification'
**Solution:** Run `npx prisma generate` to regenerate the Prisma Client

### Issue: CSV upload doesn't accept RGSTYPE
**Solution:** Ensure the column name is exactly "RGSTYPE" (case-sensitive)

### Issue: Blocked schools can still access
**Solution:** Implement middleware checks for blocked status in school routes

### Issue: Counts not updating
**Solution:** Clear cache by restarting the server or wait for cache TTL (5 minutes)

## Future Enhancements

Potential improvements for future versions:
- Bulk operations UI for blocking/unblocking multiple entities
- Export blocked entities list
- Audit log for all admin actions
- Scheduled blocking/unblocking
- Email notifications for blocked entities
- More granular permission controls

## Support

For issues or questions about these features, refer to:
- Database schema: `prisma/schema.prisma`
- Backend APIs: `app/api/admin/`
- Frontend components: `app/(public)/admin/`
