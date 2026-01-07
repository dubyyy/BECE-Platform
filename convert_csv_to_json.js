const fs = require('fs');

// Read the CSV file
const csvFile = 'C:/Users/LENOVO/Documents/bece schools 2026 dubem.csv';
const jsonFile = 'data.json';

const csvData = fs.readFileSync(csvFile, 'utf-8');
const lines = csvData.split('\n');

// Parse CSV
const headers = lines[0].split(',');
const data = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line handling quoted values
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    
    // Create object matching data.json format (all values as strings)
    const schoolEntry = {
        lgaCode: values[0].trim(),
        lCode: values[1].trim(),
        schCode: values[2].trim(),
        progID: values[3].trim(),
        schName: values[4].trim(),
        id: values[5].trim()
    };
    
    data.push(schoolEntry);
}

// Write to JSON file (compact format like data.json)
fs.writeFileSync(jsonFile, JSON.stringify(data), 'utf-8');

console.log(`Successfully converted ${data.length} records from ${csvFile} to ${jsonFile}`);
