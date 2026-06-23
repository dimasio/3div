/**
 * AOT-конвертер IFC → Fragments (.frag + .json)
 * Для web-ifc 0.0.77+
 * 
 * Запуск: node scripts/convert.js <путь_к_ifc_файлу>
 * Пример: node scripts/convert.js uploads/model_1781869108512.ifc
 * 
 * Выходные файлы:
 *   - public/model.frag - бинарный файл с геометрией (vertex positions + face indices)
 *   - public/properties.json - метаданные элементов
 */

import { IfcAPI } from 'web-ifc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Конфигурация
 */
const CONFIG = {
  ifcPath: process.argv[2] || join(projectRoot, 'uploads', 'model_1781869108512.ifc'),
  fragOutput: join(projectRoot, 'public', 'model.frag'),
  jsonOutput: join(projectRoot, 'public', 'properties.json'),
  typesToExtract: ['IfcWall', 'IfcSlab', 'IfcBeam', 'IfcColumn', 'IfcWindow', 'IfcDoor', 'IfcCurtainWall', 'IfcMember', 'IfcPlate', 'IfcFoundation']
};

/**
 * Инициализация web-ifc API
 */
async function initIfcAPI() {
  const wasmPath = join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
  const wasmUrl = 'file://' + wasmPath;
  
  console.log(`📦 Wasm путь: ${wasmPath}`);
  console.log(`📦 Wasm существует: ${existsSync(wasmPath)}`);
  
  if (!existsSync(wasmPath)) {
    throw new Error(`WASM файл не найден: ${wasmPath}`);
  }
  
  const ifcApi = new IfcAPI();
  await ifcApi.Init(() => wasmUrl);
  
  return ifcApi;
}

/**
 * Извлечение свойств элемента (Pset)
 */
function extractProperties(ifcApi, modelId, expressId) {
  const properties = {};
  
  try {
    const defines = ifcApi.GetByType(modelId, 23);
    
    for (let i = 0; i < defines.size(); i++) {
      const relationId = defines.get(i);
      const relation = ifcApi.GetLine(modelId, relationId);
      
      if (!relation?.RelatedObjects) continue;
      
      let isRelated = false;
      for (let j = 0; j < relation.RelatedObjects.length; j++) {
        if (relation.RelatedObjects[j].oid === expressId) {
          isRelated = true;
          break;
        }
      }
      
      if (!isRelated) continue;
      
      const propertySet = relation.RelatingPropertyDefinition;
      if (!propertySet?.HasProperties) continue;
      
      const setName = propertySet.Name?.value || 'Unnamed';
      
      for (let j = 0; j < propertySet.HasProperties.length; j++) {
        const prop = propertySet.HasProperties[j];
        const propName = prop.Name?.value || 'Unnamed';
        const propNameFull = `${setName}.${propName}`;
        
        if (prop?.NominalValue?.value !== undefined) {
          properties[propNameFull] = prop.NominalValue.value;
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  
  return properties;
}

/**
 * Извлечение координат позиции элемента
 */
function extractPosition(ifcApi, modelId, expressId) {
  try {
    const element = ifcApi.GetLine(modelId, expressId);
    if (!element?.ObjectPlacement?.PlacementToReference?.Location?.Coordinates) {
      return { x: 0, y: 0, z: 0 };
    }
    
    const coords = element.ObjectPlacement.PlacementToReference.Location.Coordinates;
    return {
      x: Number(coords[0]) || 0,
      y: Number(coords[1]) || 0,
      z: Number(coords[2]) || 0
    };
  } catch (e) {
    return { x: 0, y: 0, z: 0 };
  }
}

/**
 * Получение геометрии элемента через GetFlatMesh (web-ifc 0.0.77+)
 * В этой версии API геометрия возвращается как IfcGeometry с указателями в WASM памяти
 */
function extractGeometryFromWasmHeap(ifcApi, modelId, expressId) {
  try {
    // GetFlatMesh возвращает IfcFlatMesh с IfcPlacedGeometryVector
    const flatMesh = ifcApi.GetFlatMesh(modelId, expressId);
    
    // Получаем placed geometry
    const placedGeom = flatMesh.geometries.get(0);
    if (!placedGeom || !placedGeom.geometryExpressID) {
      return null;
    }
    
    // Получаем геометрию по geometryExpressID
    const geomId = placedGeom.geometryExpressID;
    const geometry = ifcApi.GetGeometry(modelId, geomId);
    
    // Получаем размеры данных
    const vertexDataSize = geometry.GetVertexDataSize();
    const indexDataSize = geometry.GetIndexDataSize();
    
    if (vertexDataSize === 0 || indexDataSize === 0) {
      return null;
    }
    
    // Получаем указатели на данные
    const vertexPtr = geometry.GetVertexData();
    const indexPtr = geometry.GetIndexData();
    
    // Получаем counts (количество float значений)
    const vertexCount = vertexDataSize / 4; // float = 4 байта
    const indexCount = indexDataSize / 4;
    
    // Читаем данные из WASM HEAP
    const heapF32 = ifcApi.wasmModule.HEAPF32;
    const heapU32 = ifcApi.wasmModule.HEAPU32;
    
    const vertexStart = Math.floor(vertexPtr / 4);
    const indexStart = Math.floor(indexPtr / 4);
    
    // Копируем данные в JavaScript массивы
    const vertices = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      vertices[i] = heapF32[vertexStart + i];
    }
    
    const indices = new Uint32Array(indexCount);
    for (let i = 0; i < indexCount; i++) {
      indices[i] = heapU32[indexStart + i];
    }
    
    return {
      vertices: Array.from(vertices),
      faces: Array.from(indices)
    };
  } catch (e) {
    console.log(`   Ошибка получения геометрии для ${expressId}:`, e.message);
    return null;
  }
}

/**
 * Получение всех элементов модели с фильтрацией по типам
 */
function getAllElementsFiltered(ifcApi, modelId, typesFilter) {
  const elementsMap = new Map();
  const typeCounts = new Map();
  const meshData = [];
  
  // Сначала получаем все линии для построения elementsMap
  const allLines = ifcApi.GetAllLines(modelId);
  console.log(`📊 Всего линий в модели: ${allLines.size()}`);
  
  let count = 0;
  for (let i = 0; i < allLines.size(); i++) {
    const expressId = allLines.get(i);
    const elementData = ifcApi.GetLine(modelId, expressId);
    
    if (elementData?.type !== -1) {
      const typeName = ifcApi.GetNameFromTypeCode(elementData.type);
      
      if (typesFilter.includes(typeName)) {
        typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);
        
        elementsMap.set(expressId, {
          id: expressId,
          type: typeName,
          typeId: elementData.type,
          name: elementData.Name?.value || '',
          data: elementData
        });
      }
      
      count++;
      
      if (count % 10000 === 0) {
        console.log(`   Обработано элементов: ${count}...`);
      }
    }
  }
  
  console.log(`✅ Найдено элементов: ${elementsMap.size}`);
  
  // Теперь получаем геометрии для всех элементов
  console.log('\n📦 Получение геометрий для всех элементов...');
  let geoCount = 0;
  let notFoundCount = 0;
  
  for (const [expressId, element] of elementsMap) {
    try {
      const geometry = extractGeometryFromWasmHeap(ifcApi, modelId, expressId);
      
      if (geometry) {
        meshData.push({
          expressID: expressId,
          vertices: geometry.vertices,
          faces: geometry.faces
        });
        geoCount++;
        
        if (geoCount % 1000 === 0) {
          console.log(`   Геометрий извлечено: ${geoCount}...`);
        }
      } else {
        notFoundCount++;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  console.log(`✅ Извлечено геометрий: ${geoCount}`);
  if (notFoundCount > 0) {
    console.log(`⚠️  Геометрия не найдена для ${notFoundCount} элементов`);
  }
  
  console.log('\n📋 Типы конструктивных элементов:');
  let typeCount = 0;
  for (const [type, count] of typeCounts) {
    console.log(`   ${type}: ${count}`);
    typeCount++;
    if (typeCount >= 50) break;
  }
  
  return { elementsMap, meshData };
}

/**
 * Основная функция конвертации
 */
async function convertIFCToFragments() {
  console.log('🚀 Запуск конвертации IFC → Fragments');
  console.log(`📄 Исходный файл: ${CONFIG.ifcPath}`);
  
  if (!existsSync(CONFIG.ifcPath)) {
    throw new Error(`IFC файл не найден: ${CONFIG.ifcPath}`);
  }
  
  const fileBuffer = readFileSync(CONFIG.ifcPath);
  const ifcByteArray = new Uint8Array(fileBuffer);
  console.log(`📄 Размер файла: ${(ifcByteArray.length / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('🔧 Инициализация web-ifc...');
  const ifcApi = await initIfcAPI();
  
  console.log('📂 Открытие модели...');
  const modelId = ifcApi.OpenModel(ifcByteArray);
  console.log(`✅ Модель открыта (ID: ${modelId})`);
  
  console.log(`🔍 Извлечение конструктивных элементов (${CONFIG.typesToExtract.length} типов)...`);
  const { elementsMap, meshData } = getAllElementsFiltered(ifcApi, modelId, CONFIG.typesToExtract);
  console.log(`✅ Найдено элементов: ${elementsMap.size}`);
  console.log(`✅ Извлечено геометрий: ${meshData.length}`);
  
  console.log('\n📦 Извлечение данных из элементов...');
  const propertiesData = [];
  const geometryData = [];
  let processed = 0;
  let elementsWithGeometry = 0;
  
  for (const mesh of meshData) {
    const element = elementsMap.get(mesh.expressID) || {
      id: mesh.expressID,
      type: 'Unknown',
      typeId: 0,
      name: 'Без имени'
    };
    
    const position = extractPosition(ifcApi, modelId, mesh.expressID);
    const properties = extractProperties(ifcApi, modelId, mesh.expressID);
    
    propertiesData.push({
      id: mesh.expressID,
      type: element.type,
      name: element.name || 'Без имени',
      position: position,
      properties: properties
    });
    
    geometryData.push({
      id: mesh.expressID,
      vertices: mesh.vertices,
      faces: mesh.faces
    });
    elementsWithGeometry++;
    
    processed++;
    if (processed % 1000 === 0) {
      console.log(`   Извлечено: ${processed}/${meshData.length}...`);
    }
  }
  
  console.log(`✅ Извлечено данных: ${propertiesData.length}`);
  console.log(`✅ Элементов с геометрией: ${elementsWithGeometry}`);
  
  // Сохраняем properties.json
  console.log(`\n💾 Сохранение свойств в ${CONFIG.jsonOutput}...`);
  writeFileSync(CONFIG.jsonOutput, JSON.stringify(propertiesData, null, 2));
  console.log(`✅ Сохранено: ${propertiesData.length} элементов`);
  
  // Формируем бинарный файл .frag
  // Формат:
  // - uint32: количество геометрий
  // - для каждой геометрии:
  //   - uint32: elementId
  //   - uint32: количество вершин
  //   - float32[]: вершины (x, y, z, x, y, z, ...)
  //   - uint32: количество индексов
  //   - uint32[]: индексы (a, b, c, a, b, c, ...)
  
  console.log('\n📦 Генерация бинарного файла .frag...');
  
  // Записываем в буфер
  const buffer = new ArrayBuffer(4 + geometryData.reduce((acc, geo) => {
    return acc + 4 + 4 + geo.vertices.length * 4 + 4 + geo.faces.length * 4;
  }, 0));
  
  const view = new DataView(buffer);
  let offset = 0;
  
  // Записываем количество геометрий
  view.setUint32(offset, geometryData.length, true);
  offset += 4;
  
  // Записываем каждую геометрию
  for (const geo of geometryData) {
    // elementId
    view.setUint32(offset, geo.id, true);
    offset += 4;
    
    // количество вершин
    view.setUint32(offset, geo.vertices.length, true);
    offset += 4;
    
    // вершины
    for (const v of geo.vertices) {
      view.setFloat32(offset, v, true);
      offset += 4;
    }
    
    // количество индексов
    view.setUint32(offset, geo.faces.length, true);
    offset += 4;
    
    // индексы
    for (const f of geo.faces) {
      view.setUint32(offset, f, true);
      offset += 4;
    }
  }
  
  // Сохраняем .frag файл
  console.log(`💾 Сохранение фрагментов в ${CONFIG.fragOutput}...`);
  writeFileSync(CONFIG.fragOutput, Buffer.from(buffer));
  console.log(`✅ Файл .frag сохранен: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
  
  // Освобождаем ресурсы web-ifc
  console.log('\n🗑️ Освобождение памяти...');
  ifcApi.CloseModel(modelId);
  
  console.log('\n✅ Конвертация завершена успешно!');
  console.log(`📊 Результаты:`);
  console.log(`   - Исходный файл: ${(ifcByteArray.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Фрагменты (.frag): ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Метаданные (.json): ${(propertiesData.length * 100 / 1024 / 1024).toFixed(3)} MB`);
  console.log(`   - Элементов: ${propertiesData.length}`);
  console.log(`   - С геометрией: ${elementsWithGeometry}`);
  console.log(`   - Время: выполнено`);
}

// Запуск конвертации
convertIFCToFragments().catch((err) => {
  console.error('❌ Ошибка конвертации:', err);
  process.exit(1);
});