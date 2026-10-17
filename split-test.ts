import fs from 'fs';
let content = fs.readFileSync('src/utils/insulinMath.ts', 'utf-8');
content = content.replace(/secondDoseTiming: string;/g, 'secondDoseTiming: string;\n  subsequentDoses?: { part: number; units: number; delayHours: number; delayFormatted: string; timing: string; }[];');
fs.writeFileSync('src/utils/insulinMath.ts', content);
