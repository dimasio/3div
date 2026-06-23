import { IfcAPI } from 'web-ifc';

// Создадим простой тест и посмотрим GetLines
const api = new IfcAPI();

// Создадим модель
const modelId = api.CreateModel();
console.log('Model created with ID:', modelId);

// Получим все линии
const allLines = api.GetAllLines(modelId);
console.log('All lines size:', allLines.size());

// Попробуем GetLines
try {
  const lines = api.GetLines(modelId, 23); // IfcRelDefinesByProperties
  console.log('GetLines(23) size:', lines.size());
} catch (e) {
  console.log('GetLines error:', e.message);
}

// Попробуем GetLines с пустым массивом
try {
  const lines2 = api.GetLines(modelId, []);
  console.log('GetLines([]) size:', lines2.size());
} catch (e) {
  console.log('GetLines([]) error:', e.message);
}

// Попробуем GetLines с типом
try {
  const lines3 = api.GetLines(modelId, [23]);
  console.log('GetLines([23]) size:', lines3.size());
} catch (e) {
  console.log('GetLines([23]) error:', e.message);
}