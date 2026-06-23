import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const wasmPath = join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
const wasmUrl = 'file://' + wasmPath;

console.log('Инициализация...');
const api = new IfcAPI();
await api.Init(() => wasmUrl);

const fileBuffer = readFileSync('test.ifc');
const modelId = api.OpenModel(fileBuffer, true, false);

// Получаем Body representation
const bodyRepId = 1304947;

console.log('Body Representation ID:', bodyRepId);

const bodyData = api.GetRawLineData(modelId, bodyRepId);
console.log('\n=== Body Representation Data ===');
console.log(JSON.stringify(bodyData, null, 2));

// Проверяем тип
const typeName = bodyData.type ? api.GetNameFromTypeCode(bodyData.type) : 'unknown';
console.log('\ntypeName:', typeName);

// Проверяем GetGeometry для Body
console.log('\n=== GetGeometry для Body ===');
const geometry = api.GetGeometry(modelId, bodyRepId);
console.log('geometry:', geometry);
console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());

api.CloseModel(modelId);
console.log('\nDone');