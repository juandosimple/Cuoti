import fs from 'fs';
import path from 'path';

const outputFilename = 'latest.json';
const manifests = process.argv.slice(2);

let finalManifest = {
  version: '',
  notes: '',
  pub_date: '',
  platforms: {}
};

manifests.forEach(file => {
  if (fs.existsSync(file)) {
    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    // Use metadata from the first file found (should be consistent)
    if (!finalManifest.version) {
      finalManifest.version = content.version;
      finalManifest.notes = content.notes;
      finalManifest.pub_date = content.pub_date;
    }

    // Merge platforms
    finalManifest.platforms = {
      ...finalManifest.platforms,
      ...content.platforms
    };
  } else {
    console.warn(`Manifest file not found: ${file}`);
  }
});

fs.writeFileSync(outputFilename, JSON.stringify(finalManifest, null, 2));
console.log(`Merged ${manifests.length} manifests into ${outputFilename}`);
