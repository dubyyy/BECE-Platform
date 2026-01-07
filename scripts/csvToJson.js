const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const csvFilePath = path.join(__dirname, '..', 'NEW 2025 pry schs LIST.csv');
const jsonFilePath = path.join(__dirname, '..', 'data.json');

const results = [];

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
    console.log(`Successfully converted CSV to JSON. Output saved to ${jsonFilePath}`);
  })
  .on('error', (error) => {
    console.error('Error processing CSV file:', error);
  });
