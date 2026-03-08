import { AVAILABLE_MODELS } from "./src/lib/models.js";
import { getModelLogoSrc } from "./src/lib/modelLogos.js";

console.log("--- LOGO MAPPING DIAGNOSTIC ---");
AVAILABLE_MODELS.forEach(m => {
    const logo = getModelLogoSrc(m.id);
    console.log(`Model: ${m.label}`);
    console.log(`  ID: ${m.id}`);
    console.log(`  Logo: ${logo}`);
    console.log("----------------------------");
});
