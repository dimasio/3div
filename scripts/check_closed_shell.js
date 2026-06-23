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

// Получаем IfcFacetedBrep -> IfcClosedShell
const facetedBrepId = 1304947;

console.log('IfcFacetedBrep ID:', facetedBrepId);

const facetedBrepData = api.GetRawLineData(modelId, facetedBrepId);
console.log('\n=== IfcFacetedBrep Data ===');
console.log(JSON.stringify(facetedBrepData, null, 2));

const shellId = facetedBrepData.arguments[0].value;
console.log('\nIfcClosedShell ID:', shellId);

const shellData = api.GetRawLineData(modelId, shellId);
console.log('\n=== IfcClosedShell Data ===');
console.log(JSON.stringify(shellData, null, 2));

// Проверяем тип
const typeName = shellData.type ? api.GetNameFromTypeCode(shellData.type) : 'unknown';
console.log('\ntypeName:', typeName);

// Проверяем GetGeometry для IfcClosedShell
console.log('\n=== GetGeometry для IfcClosedShell ===');
const geometry = api.GetGeometry(modelId, shellId);
console.log('geometry:', geometry);
console.log('  GetVertexDataSize():', geometry.GetVertexDataSize());
console.log('  GetIndexDataSize():', geometry.GetIndexDataSize());

api.CloseModel(modelId);
console.log('\nDone');