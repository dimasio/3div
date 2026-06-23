import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wasmPath = join(__dirname, '..', 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

const api = new IfcAPI();
await api.Init(() => wasmUrl);

console.log('Init OK');

// Открываем реальный файл
const ifcPath = join(__dirname, 'fixtures', 'minimal.ifc');
const buffer = readFileSync(ifcPath);
const modelId = api.OpenModel(new Uint8Array(buffer));
console.log('Model opened with ID:', modelId);

// Попробуем GetAllLines с .length
try {
  const allLines = api.GetAllLines(modelId);
  console.log('GetAllLines:', allLines);
  console.log('GetAllLines length:', allLines.length);
  for (let i = 0; i < allLines.length; i++) {
    const expressId = allLines[i];
    const elementData = api.GetLine(modelId, expressId);
    const typeName = api.GetNameFromTypeCode(elementData.type);
    console.log('  Line', i, 'expressId:', expressId, 'type:', typeName, 'typeCode:', elementData.type);
  }
} catch (e) {
  console.log('GetAllLines error:', e.message);
  console.log(e);
}