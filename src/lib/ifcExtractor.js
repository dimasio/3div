// Используем ES-модули (import)
import { IfcAPI, IFCWALL, IFCSLAB, IFCBEAM, IFCCOLUMN, IFCGRID } from 'web-ifc';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initIfcAPI, buildPropertiesMap, extractPosition } from './ifcUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Модуль для извлечения конструктивных элементов и подложек из IFC-модели
 */

/**
 * Получает все элементы модели
 * @param {IfcAPI} ifcAPI - API web-ifc
 * @param {number} modelId - ID загруженной модели
 * @param {number} maxElements - Максимальное количество элементов (0 = без ограничений)
 * @returns {Map<number, any>} Карта всех элементов
 */
function getAllElements(ifcAPI, modelId, maxElements = 0) {
  const elementsMap = new Map();
  const typeCounts = new Map();

  try {
    // Получаем все линии модели
    const allLines = ifcAPI.GetAllLines(modelId);

    console.log(`📊 Всего линий в модели: ${allLines.size()}`);

    let count = 0;
    for (let i = 0; i < allLines.size(); i++) {
      const expressId = allLines.get(i);
      const elementData = ifcAPI.GetLine(modelId, expressId);

      if (elementData && elementData.type !== -1) {
        const typeName = ifcAPI.GetNameFromTypeCode(elementData.type);

        // Считаем типы
        typeCounts.set(typeName, (typeCounts.get(typeName) || 0) + 1);

        elementsMap.set(expressId, {
          id: expressId,
          type: typeName,
          typeId: elementData.type,
          data: elementData
        });

        count++;

        // Лимит элементов (0 = без ограничений)
        if (maxElements > 0 && count >= maxElements) {
          console.log(`⚠️ Достигнут лимит элементов: ${maxElements}`);
          break;
        }

        // Периодически отдаём контроль событийному циклу
        if (count % 5000 === 0) {
          console.log(`   Обработано элементов: ${count}...`);
        }
      }
    }

    // Логируем все типы
    console.log('\n📋 Все типы элементов:');
    let typeCount = 0;
    for (const [type, count] of typeCounts) {
      console.log(`   ${type}: ${count}`);
      typeCount++;
      if (typeCount >= 50) break; // Лимит вывода типов
    }

  } catch (e) {
    console.error('Ошибка при получении элементов:', e);
  }

  return elementsMap;
}

/**
 * Извлекает данные из элемента
 * @param {IfcAPI} ifcAPI - API web-ifc
 * @param {object} element - Элемент из карты
 * @param {number} modelId - ID модели
 * @param {Map<number, object>} propertiesMap - Карта свойств (построена один раз)
 * @returns {object} Объект с данными элемента
 */
function extractElementData(ifcAPI, element, modelId, propertiesMap) {
  try {
    const properties = propertiesMap.get(element.id) || {};
    const position = extractPosition(ifcAPI, modelId, element.id);

    return {
      id: element.id,
      type: element.type,
      name: element.data.Name?.value || '',
      position: position,
      properties: properties,
      typeCode: element.typeId
    };
  } catch (e) {
    console.error('Ошибка при извлечении данных элемента:', e);
    return null;
  }
}

/**
 * Извлекает данные из элемента (старая версия без propertiesMap - для совместимости)
 * @param {IfcAPI} ifcAPI - API web-ifc
 * @param {object} element - Элемент из карты
 * @param {number} modelId - ID модели
 * @returns {object} Объект с данными элемента
 */
function extractElementDataOld(ifcAPI, element, modelId) {
  try {
    const properties = getProperties(ifcAPI, element.id, modelId);
    const position = extractPosition(ifcAPI, modelId, element.id);

    return {
      id: element.id,
      type: element.type,
      name: element.data.Name?.value || '',
      position: position,
      properties: properties,
      typeCode: element.typeId
    };
  } catch (e) {
    console.error('Ошибка при извлечении данных элемента:', e);
    return null;
  }
}

/**
 * Получает свойства элемента (Pset) - старая версия, оставлена для совместимости
 * @param {IfcAPI} ifcAPI - API web-ifc
 * @param {number} expressId - ID элемента
 * @param {number} modelId - ID модели
 * @returns {object} Объект со свойствами
 */
function getProperties(ifcAPI, expressId, modelId) {
  const properties = {};

  try {
    // Получаем свойства через IsDefinedBy (связь с определением свойств)
    const defines = ifcAPI.GetByType(modelId, 23); // IfcRelDefinesByProperties

    for (let i = 0; i < defines.size(); i++) {
      const relationId = defines.get(i);
      const relation = ifcAPI.GetLine(modelId, relationId);

      if (!relation || !relation.RelatedObjects) continue;

      // Проверяем, связано ли это с нашим элементом
      let isRelated = false;
      for (let j = 0; j < relation.RelatedObjects.length; j++) {
        if (relation.RelatedObjects[j].oid === expressId) {
          isRelated = true;
          break;
        }
      }

      if (!isRelated) continue;

      // Получаем PropertySet
      const propertySet = relation.RelatingPropertyDefinition;
      if (!propertySet || !propertySet.HasProperties) continue;

      const setName = propertySet.Name?.value || 'Unnamed';

      for (let j = 0; j < propertySet.HasProperties.length; j++) {
        const prop = propertySet.HasProperties[j];
        const propName = prop.Name?.value || 'Unnamed';
        const propNameFull = `${setName}.${propName}`;

        if (prop.NominalValue) {
          properties[propNameFull] = prop.NominalValue.value;
        }
      }
    }
  } catch (e) {
    // Ошибки при извлечении свойств игнорируем
  }

  return properties;
}

/**
 * Основная функция для извлечения данных из IFC-файла
 * @param {string} filePath - Путь к IFC-файлу
 * @returns {Promise<object>} Объект с structuralElements и underlays
 */
async function extractIFC(filePath) {
  // Создаём новый экземпляр API (без глобального синглтона)
  const ifcAPI = await initIfcAPI();

  // Читаем файл как ArrayBuffer
  const fileBuffer = fs.readFileSync(filePath);
  const ifcByteArray = new Uint8Array(fileBuffer);

  // Загружаем модель
  const modelId = ifcAPI.OpenModel(ifcByteArray);

  // Инициализируем массивы для результатов
  const structuralElements = [];
  const underlays = [];

  // Получаем все элементы (ограничимся 10000 для производительности)
  const elementsMap = getAllElements(ifcAPI, modelId, 10000);

  console.log(`📊 Извлечение данных из ${elementsMap.size} элементов...`);

  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Строим карту свойств ОДИН РАЗ перед циклом (O(n) вместо O(n²))
  const propertiesMap = buildPropertiesMap(ifcAPI, modelId);
  console.log(`📊 Построена карта свойств: ${propertiesMap.size} элементов с данными`);

  // Извлекаем данные из всех элементов (используем предварительно построенную карту)
  let count = 0;
  for (const [expressId, element] of elementsMap) {
    const elementData = extractElementData(ifcAPI, element, modelId, propertiesMap);

    if (!elementData) {
      console.log(`⚠️ Пропущен элемент ${element.id} - extractElementData вернул null`);
      continue;
    }

    // Все элементы добавляем в structuralElements (для отображения в таблице)
    structuralElements.push(elementData);

    count++;
    if (count % 1000 === 0) {
      console.log(`   Извлечено элементов: ${count}...`);
    }
  }

  console.log(`✅ Всего элементов: ${structuralElements.length}`);

  // TODO: Заполнение underlays массива
  // Для заполнения underlays нужно фильтровать элементы по типам IFCGRID и IFCANNOTATION
  // Аналогично конструктиву, но с другим фильтром
  // const allLines = ifcAPI.GetAllLines(modelId);
  // for (let i = 0; i < allLines.size(); i++) {
  //   const expressId = allLines.get(i);
  //   const elementData = ifcAPI.GetLine(modelId, expressId);
  //   if (elementData && elementData.type !== -1) {
  //     const typeName = ifcAPI.GetNameFromTypeCode(elementData.type);
  //     if (typeName === 'IFCGRID' || typeName === 'IFCANNOTATION') {
  //       underlays.push({...});
  //     }
  //   }
  // }

  // Обязательная очистка памяти Wasm
  ifcAPI.CloseModel(modelId);

  return {
    structuralElements,
    underlays
  };
}

/**
 * Экспорт отдельных функций для тестирования
 */
export { extractIFC, getAllElements, extractElementData, getProperties };