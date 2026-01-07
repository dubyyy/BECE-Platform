import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface SchoolData {
  lgaCode: number;
  lCode: number;
  schCode: number;
  progID: number;
  schName: string;
  id: number;
}

async function syncDatabaseWithJSON() {
  try {
    console.log('🔄 Starting database sync with data.json...\n');

    // Read data.json
    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const validSchools: SchoolData[] = JSON.parse(fileContent);

    console.log(`📄 Found ${validSchools.length} schools in data.json\n`);

    // Get all schools from database
    const dbSchools = await prisma.school.findMany({
      select: {
        id: true,
        lgaCode: true,
        schoolCode: true,
        schoolName: true,
        _count: {
          select: {
            studentRegistrations: true
          }
        }
      }
    });

    console.log(`🗄️  Found ${dbSchools.length} schools in database\n`);

    // Create a lookup map for valid schools
    const validSchoolsMap = new Map(
      validSchools.map(s => [`${s.lgaCode}-${s.schCode}`, s])
    );

    // Find schools in DB that are no longer in data.json
    const orphanedSchools = dbSchools.filter(
      dbSchool => !validSchoolsMap.has(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`)
    );

    if (orphanedSchools.length === 0) {
      console.log('✅ All database schools are valid in data.json');
    } else {
      console.log(`⚠️  Found ${orphanedSchools.length} schools in database NOT in data.json:\n`);
      
      orphanedSchools.forEach(school => {
        console.log(`  - ${school.schoolName} (LGA: ${school.lgaCode}, School: ${school.schoolCode})`);
        console.log(`    Registered Students: ${school._count.studentRegistrations}`);
      });

      console.log('\n❓ Do you want to remove these orphaned schools?');
      console.log('   Run: npm run sync-db -- --remove-orphaned');
    }

    // Check for schools in data.json that might need updating in DB
    const schoolsToUpdate = dbSchools.filter(dbSchool => {
      const validSchool = validSchoolsMap.get(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`);
      return validSchool && validSchool.schName !== dbSchool.schoolName;
    });

    if (schoolsToUpdate.length > 0) {
      console.log(`\n📝 Found ${schoolsToUpdate.length} schools with name mismatches:\n`);
      
      for (const dbSchool of schoolsToUpdate) {
        const validSchool = validSchoolsMap.get(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`)!;
        console.log(`  - DB: "${dbSchool.schoolName}"`);
        console.log(`    JSON: "${validSchool.schName}"\n`);
      }

      console.log('❓ Do you want to update these school names?');
      console.log('   Run: npm run sync-db -- --update-names');
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  - Valid schools in data.json: ${validSchools.length}`);
    console.log(`  - Schools in database: ${dbSchools.length}`);
    console.log(`  - Orphaned schools (in DB, not in JSON): ${orphanedSchools.length}`);
    console.log(`  - Schools with name mismatches: ${schoolsToUpdate.length}`);

  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function removeOrphanedSchools() {
  try {
    console.log('🗑️  Removing orphaned schools...\n');

    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const validSchools: SchoolData[] = JSON.parse(fileContent);

    const validSchoolsMap = new Map(
      validSchools.map(s => [`${s.lgaCode}-${s.schCode}`, s])
    );

    const dbSchools = await prisma.school.findMany({
      select: {
        id: true,
        lgaCode: true,
        schoolCode: true,
        schoolName: true,
      }
    });

    const orphanedSchools = dbSchools.filter(
      dbSchool => !validSchoolsMap.has(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`)
    );

    if (orphanedSchools.length === 0) {
      console.log('✅ No orphaned schools to remove');
      return;
    }

    for (const school of orphanedSchools) {
      await prisma.school.delete({
        where: { id: school.id }
      });
      console.log(`  ✅ Removed: ${school.schoolName}`);
    }

    console.log(`\n✅ Successfully removed ${orphanedSchools.length} orphaned schools`);

  } catch (error) {
    console.error('❌ Error removing orphaned schools:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updateSchoolNames() {
  try {
    console.log('📝 Updating school names...\n');

    const dataPath = path.join(process.cwd(), 'data.json');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const validSchools: SchoolData[] = JSON.parse(fileContent);

    const validSchoolsMap = new Map(
      validSchools.map(s => [`${s.lgaCode}-${s.schCode}`, s])
    );

    const dbSchools = await prisma.school.findMany({
      select: {
        id: true,
        lgaCode: true,
        schoolCode: true,
        schoolName: true,
      }
    });

    const schoolsToUpdate = dbSchools.filter(dbSchool => {
      const validSchool = validSchoolsMap.get(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`);
      return validSchool && validSchool.schName !== dbSchool.schoolName;
    });

    if (schoolsToUpdate.length === 0) {
      console.log('✅ No school names to update');
      return;
    }

    for (const dbSchool of schoolsToUpdate) {
      const validSchool = validSchoolsMap.get(`${dbSchool.lgaCode}-${dbSchool.schoolCode}`)!;
      await prisma.school.update({
        where: { id: dbSchool.id },
        data: { schoolName: validSchool.schName }
      });
      console.log(`  ✅ Updated: "${dbSchool.schoolName}" → "${validSchool.schName}"`);
    }

    console.log(`\n✅ Successfully updated ${schoolsToUpdate.length} school names`);

  } catch (error) {
    console.error('❌ Error updating school names:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--remove-orphaned')) {
  removeOrphanedSchools();
} else if (args.includes('--update-names')) {
  updateSchoolNames();
} else {
  syncDatabaseWithJSON();
}
