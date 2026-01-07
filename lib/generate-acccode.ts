import { PrismaClient } from '@prisma/client';

/**
 * Generates a unique 10-digit account code for student registration
 * @param prisma - PrismaClient instance
 * @returns A unique 10-digit string
 */
export async function generateUniqueAccCode(prisma: PrismaClient): Promise<string> {
  let accCode: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate a random 10-digit number
    accCode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    // Check if it already exists
    const existing = await prisma.studentRegistration.findUnique({
      where: { accCode },
      select: { id: true },
    });
    
    if (!existing) {
      isUnique = true;
      return accCode;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique account code after multiple attempts');
}

/**
 * Generates multiple unique account codes in a single batch operation
 * Optimized to avoid N+1 queries - makes only ONE database query
 * @param prisma - PrismaClient instance
 * @param count - Number of codes to generate
 * @returns Array of unique 10-digit strings
 */
export async function generateBatchAccCodes(
  prisma: PrismaClient, 
  count: number
): Promise<string[]> {
  const maxAttempts = 3;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Generate candidate codes
    const candidates = new Set<string>();
    while (candidates.size < count) {
      const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      candidates.add(code);
    }
    
    const candidateArray = Array.from(candidates);
    
    // Single query to check all codes at once
    const existing = await prisma.studentRegistration.findMany({
      where: {
        accCode: {
          in: candidateArray,
        },
      },
      select: { accCode: true },
    });
    
    const existingSet = new Set(existing.map(r => r.accCode));
    const uniqueCodes = candidateArray.filter(code => !existingSet.has(code));
    
    // If we got enough unique codes, return them
    if (uniqueCodes.length >= count) {
      return uniqueCodes.slice(0, count);
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique account codes after multiple attempts');
}
