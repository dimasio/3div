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

const modelId = api.OpenModel(new Uint8Array(readFileSync('test.ifc')));
console.log('Модель открыта, ID:', modelId);

// Проверяем StreamAllMeshes
console.log('\n=== Проверка StreamAllMeshes ===');

let meshCount = 0;
api.StreamAllMeshes(modelId, {
  onItem: (itemId, mesh) => {
    meshCount++;
    
    if (meshCount <= 3) {
      console.log(`Mesh ${meshCount}:`);
      console.log('  itemId:', itemId);
      console.log('  mesh.geometries.size():', mesh.geometries.size());
      
      // Проверяем геометрии
      for (let i = 0; i < mesh.geometries.size() && i < 1; i++) {
        const geom = mesh.geometries.get(i);
        console.log('  geom type:', typeof geom);
        console.log('  geom keys:', Object.keys(geom));
        console.log('  Has GetVertexData?', typeof geom.GetVertexData);
        console.log('  Has GetIndexData?', typeof geom.GetIndexData);
        
        try {
          const vertices = geom.GetVertexData();
          console.log('  GetVertexData length:', vertices.length);
        } catch (e) {
          console.log('  GetVertexData error:', e.message);
        }
        
        try {
          const indices = geom.GetIndexData();
          console.log('  GetIndexData length:', indices.length);
        } catch (e) {
          console.log('  GetIndexData error:', e.message);
        }
      }
    }
    
    // Вызываем onFinished после 10 мешей
    if (meshCount >= 10) {
      api.StreamFinished(modelId);
    }
  },
  onError: (error) => {
    console.error('Stream error:', error);
    api.StreamFinished(modelId);
  },
  onFinished: () => {
    console.log(`\n=== Завершено: ${meshCount} мешей ===`);
    api.CloseModel(modelId);
    console.log('Done');
  }
});