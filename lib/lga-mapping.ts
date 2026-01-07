// Mapping of LGA codes to full LGA names for Delta State
export const LGA_MAPPING: Record<string, string> = {
  "1420256700": "Aniocha North",
  "660742704": "Aniocha South",
  "99763601": "Bomadi",
  "1830665512": "Burutu",
  "88169935": "Ethiope East",
  "87907773": "Ethiope West",
  "2077558841": "Ika North-East",
  "1918656250": "Ika South",
  "1583401849": "Isoko North",
  "1159914347": "Isoko South",
  "90249440": "Ndokwa East",
  "1784211236": "Ndokwa West",
  "653025957": "Okpe",
  "1865127727": "Oshimili North",
  "1561094353": "Oshimili South",
  "1313680994": "Patani",
  "1776329831": "Sapele",
  "435624852": "Udu",
  "1118545377": "Ughelli North",
  "803769815": "Ughelli South",
  "1916789388": "Ukwuani",
  "1835037667": "Uvwie",
  "580987670": "Warri North",
  "1031892114": "Warri South",
  "1563044454": "Warri South-West",
};

export function getLGAName(code: string): string {
  // If the code is already a full name, return it
  if (code.includes(" ")) {
    return code;
  }
  
  // Otherwise, look up the mapping (codes are numeric strings)
  return LGA_MAPPING[code] || code;
}

export function getLGACode(name: string): string | null {
  // Find the code by matching the LGA name
  const entry = Object.entries(LGA_MAPPING).find(([_, lgaName]) => lgaName === name);
  return entry ? entry[0] : null;
}
