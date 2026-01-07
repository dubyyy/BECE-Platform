/**
 * Migration Script: data.json → PostgreSQL
 * 
 * This script migrates school data from data.json file to SchoolData table
 * Run once to eliminate file-based storage and concurrent write issues
 * 
 * Usage: npx tsx scripts/migrate-json-to-db.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

interface SchoolEntry {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

async function migrateDataToDatabase() {
  console.log('🚀 Starting migration from data.json to PostgreSQL...\n');

  try {
    // Read data.json
    const dataPath = path.join(process.cwd(), 'data.json');
    console.log(`📖 Reading ${dataPath}...`);
    
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const schools: SchoolEntry[] = JSON.parse(fileContent);
    
    console.log(`✅ Found ${schools.length} schools in data.json\n`);

    // Check if data already exists
    const existingCount = await prisma.schoolData.count();
    
    if (existingCount > 0) {
      console.log(`⚠️  Warning: ${existingCount} records already exist in SchoolData table`);
      console.log('Do you want to:');
      console.log('1. Skip migration (existing data will be kept)');
      console.log('2. Clear and re-import (all existing data will be deleted)');
      console.log('\nFor safety, this script will skip. To force re-import, delete SchoolData records manually.\n');
      
      console.log('✅ Migration skipped - data already exists');
      return;
    }

    // Batch insert for better performance
    console.log('📝 Inserting data into database...');
    const batchSize = 1000;
    let imported = 0;

    for (let i = 0; i < schools.length; i += batchSize) {
      const batch = schools.slice(i, i + batchSize);
      
      await prisma.schoolData.createMany({
        data: batch.map(school => ({
          id: school.id,
          lgaCode: school.lgaCode,
          lCode: school.lCode,
          schCode: school.schCode,
          progID: school.progID,
          schName: school.schName,
        })),
        skipDuplicates: true,
      });
      
      imported += batch.length;
      process.stdout.write(`\r   Progress: ${imported}/${schools.length} schools imported`);
    }

    console.log('\n\n✅ Migration completed successfully!');
    console.log(`📊 Total imported: ${imported} schools`);
    
    // Verify count
    const finalCount = await prisma.schoolData.count();
    console.log(`📊 Database count: ${finalCount} schools`);
    
    console.log('\n📝 Next steps:');
    console.log('1. Update API routes to use SchoolData table instead of data.json');
    console.log('2. Test thoroughly in development');
    console.log('3. Keep data.json as backup until fully migrated');
    console.log('4. Run: npm run build && npm run start to test in production mode\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateDataToDatabase()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
