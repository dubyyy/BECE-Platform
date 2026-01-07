import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "data.json");

interface SchoolEntry {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

// In-memory cache with indexes
let cachedData: SchoolEntry[] | null = null;
let lastModified: number | null = null;
let idIndex: Map<string, SchoolEntry> | null = null;
let lgaIndex: Map<string, SchoolEntry[]> | null = null;
let schCodeIndex: Map<string, SchoolEntry[]> | null = null;

// Load and cache data with indexes
async function loadData(): Promise<SchoolEntry[]> {
  try {
    const stats = await fs.stat(DATA_FILE_PATH);
    const currentModified = stats.mtimeMs;

    // Return cached data if file hasn't changed
    if (cachedData && lastModified === currentModified) {
      return cachedData;
    }

    // Read and cache new data
    const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const parsedData: SchoolEntry[] = JSON.parse(fileContent);
    
    // Build indexes for fast lookups
    buildIndexes(parsedData);
    
    cachedData = parsedData;
    lastModified = currentModified;
    
    return parsedData;
  } catch (error) {
    console.error("Error loading data.json:", error);
    throw error;
  }
}

// Build indexes for fast lookups
function buildIndexes(data: SchoolEntry[]) {
  idIndex = new Map();
  lgaIndex = new Map();
  schCodeIndex = new Map();
  
  for (const school of data) {
    // ID index
    idIndex.set(school.id, school);
    
    // LGA index
    if (!lgaIndex.has(school.lgaCode)) {
      lgaIndex.set(school.lgaCode, []);
    }
    lgaIndex.get(school.lgaCode)!.push(school);
    
    // School code index
    if (!schCodeIndex.has(school.schCode)) {
      schCodeIndex.set(school.schCode, []);
    }
    schCodeIndex.get(school.schCode)!.push(school);
  }
}

// Invalidate cache and indexes
function invalidateCache() {
  cachedData = null;
  lastModified = null;
  idIndex = null;
  lgaIndex = null;
  schCodeIndex = null;
}

// GET - Read schools with pagination and search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const getAll = searchParams.get("all") === "true";

    const schools = await loadData();

    // Filter by search query with optimized filtering
    let filteredSchools = schools;
    if (search) {
      const query = search.toLowerCase();
      
      // Try exact match on indexes first for super fast lookup
      if (idIndex?.has(query)) {
        filteredSchools = [idIndex.get(query)!];
      } else if (lgaIndex?.has(query)) {
        filteredSchools = lgaIndex.get(query)!;
      } else if (schCodeIndex?.has(query)) {
        filteredSchools = schCodeIndex.get(query)!;
      } else {
        // Fall back to full search only if not an exact match
        filteredSchools = [];
        for (const school of schools) {
          if (
            school.schName.toLowerCase().includes(query) ||
            school.lgaCode.includes(query) ||
            school.schCode.includes(query) ||
            school.id.includes(query)
          ) {
            filteredSchools.push(school);
          }
        }
      }
    }

    // Return all if requested (for exports, etc.)
    if (getAll) {
      return NextResponse.json({
        data: filteredSchools,
        total: filteredSchools.length,
        page: 1,
        limit: filteredSchools.length,
        totalPages: 1,
      });
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSchools = filteredSchools.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedSchools,
      total: filteredSchools.length,
      page,
      limit,
      totalPages: Math.ceil(filteredSchools.length / limit),
    });
  } catch (error) {
    console.error("Error reading data.json:", error);
    return NextResponse.json(
      { error: "Failed to read data.json" },
      { status: 500 }
    );
  }
}

// POST - Add a new school to data.json
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lgaCode, lCode, schCode, progID, schName } = body;

    if (!lgaCode || !schCode || !progID || !schName) {
      return NextResponse.json(
        { error: "Missing required fields: lgaCode, schCode, progID, schName" },
        { status: 400 }
      );
    }

    // Read current data from cache
    const schools = await loadData();

    // Generate new ID (increment from last ID)
    const lastId = schools.length > 0 
      ? parseInt(schools[schools.length - 1].id) 
      : 0;
    const newId = (lastId + 1).toString();

    // Create new entry
    const newSchool: SchoolEntry = {
      lgaCode,
      lCode: lCode || "NULL",
      schCode,
      progID,
      schName,
      id: newId,
    };

    // Add to array
    const updatedSchools = [...schools, newSchool];

    // Write back to file (no pretty-print for 60-70% smaller file & faster writes)
    await fs.writeFile(
      DATA_FILE_PATH,
      JSON.stringify(updatedSchools),
      "utf-8"
    );

    // Invalidate cache so next request reads fresh data
    invalidateCache();

    return NextResponse.json(newSchool, { status: 201 });
  } catch (error) {
    console.error("Error adding to data.json:", error);
    return NextResponse.json(
      { error: "Failed to add school to data.json" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing school in data.json
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, lgaCode, lCode, schCode, progID, schName } = body;

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Read current data from cache
    const schools = await loadData();

    // Fast lookup using index
    const existingSchool = idIndex?.get(id);
    if (!existingSchool) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Find position in array
    const schoolIndex = schools.findIndex((s) => s.id === id);
    if (schoolIndex === -1) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Update the school
    const updatedSchools = [...schools];
    updatedSchools[schoolIndex] = {
      ...schools[schoolIndex],
      ...(lgaCode && { lgaCode }),
      ...(lCode !== undefined && { lCode }),
      ...(schCode && { schCode }),
      ...(progID && { progID }),
      ...(schName && { schName }),
    };

    // Write back to file (no pretty-print for 60-70% smaller file & faster writes)
    await fs.writeFile(
      DATA_FILE_PATH,
      JSON.stringify(updatedSchools),
      "utf-8"
    );

    // Invalidate cache
    invalidateCache();

    return NextResponse.json(updatedSchools[schoolIndex]);
  } catch (error) {
    console.error("Error updating data.json:", error);
    return NextResponse.json(
      { error: "Failed to update school in data.json" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a school from data.json
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Read current data from cache
    const schools = await loadData();

    // Filter out the school
    const filteredSchools = schools.filter((s) => s.id !== id);

    if (filteredSchools.length === schools.length) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Write back to file (no pretty-print for 60-70% smaller file & faster writes)
    await fs.writeFile(
      DATA_FILE_PATH,
      JSON.stringify(filteredSchools),
      "utf-8"
    );

    // Invalidate cache
    invalidateCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting from data.json:", error);
    return NextResponse.json(
      { error: "Failed to delete school from data.json" },
      { status: 500 }
    );
  }
}
