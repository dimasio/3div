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

// Попробуем GetAllLines через spread
try {
  const allLines = [...api.GetAllLines(modelId)];
  console.log('GetAllLines (spread) length:', allLines.length);
  for (const expressId of allLines) {
    const elementData = api.GetLine(modelId, expressId);
    const typeName = api.GetNameFromTypeCode(elementData.type);
    console.log('  expressId:', expressId, 'type:', typeName, 'typeCode:', elementData.type);
  }
} catch (e) {
  console.log('GetAllLines error:', e.message);
}

// Попробуем GetLineType для конкретного expressId
try {
  const lineType = api.GetLineType(modelId, 10); // IfcWall
  console.log('GetLineType(10):', lineType);
} catch (e) {
  console.log('GetLineType error:', e.message);
}