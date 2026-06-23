/**
 * Общие утилиты для работы с IFC-файлами
 * Для web-ifc 0.0.77+
 */

import { IfcAPI } from 'web-ifc';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Инициализирует API web-ifc (создает новый экземпляр каждый вызов)
 * @returns {Promise<IfcAPI>} API для работы с IFC
 */
export async function initIfcAPI() {
  const projectRoot = join(__dirname, '..');
  const wasmPath = join(projectRoot, 'node_modules', 'web-ifc', 'web-ifc-node.wasm');
  const wasmUrl = 'file://' + wasmPath;

  if (!existsSync(wasmPath)) {
    throw new Error(`WASM файл не найден: ${wasmPath}`);
  }

  const ifcApi = new IfcAPI();
  await ifcApi.Init(() => wasmUrl);

  return ifcApi;
}

/**
 * Строит карту свойств для всех элементов (O(n) вместо O(n²))
 * @param {IfcAPI} ifcApi - API web-ifc
 * @param {number} modelId - ID загруженной модели
 * @returns {Map<number, object>} Карта expressId -> { 'Pset.PropName': value }
 */
export function buildPropertiesMap(ifcApi, modelId) {
  const propertiesMap = new Map();

  try {
    // Получаем все связи "IsDefinedBy" (IfcRelDefinesByProperties)
    const defines = ifcApi.GetByType(modelId, 23);

    for (let i = 0; i < defines.size(); i++) {
      const relationId = defines.get(i);
      const relation = ifcApi.GetLine(modelId, relationId);

      if (!relation || !relation.RelatedObjects || !relation.RelatingPropertyDefinition) {
        continue;
      }

      const propertySet = relation.RelatingPropertyDefinition;
      if (!propertySet.HasProperties) {
        continue;
      }

      const setName = propertySet.Name?.value || 'Unnamed';

      // Для каждого объекта в этой связи
      for (let j = 0; j < relation.RelatedObjects.length; j++) {
        const relatedObject = relation.RelatedObjects[j];
        const expressId = relatedObject.oid;

        if (!expressId) continue;

        // Получаем текущие свойства или создаем новые
        let elementProps = propertiesMap.get(expressId);
        if (!elementProps) {
          elementProps = {};
          propertiesMap.set(expressId, elementProps);
        }

        // Добавляем свойства из PropertySet
        for (let k = 0; k < propertySet.HasProperties.length; k++) {
          const prop = propertySet.HasProperties[k];
          const propName = prop.Name?.value || 'Unnamed';
          const propNameFull = `${setName}.${propName}`;

          if (prop.NominalValue && prop.NominalValue.value !== undefined) {
            elementProps[propNameFull] = prop.NominalValue.value;
          }
        }
      }
    }
  } catch (e) {
    console.error('Ошибка при построении карты свойств:', e);
  }

  return propertiesMap;
}

/**
 * Извлекает координаты позиции элемента
 * @param {IfcAPI} ifcApi - API web-ifc
 * @param {number} modelId - ID модели
 * @param {number} expressId - ID элемента
 * @returns {object} Объект с координатами {x, y, z}
 */
export function extractPosition(ifcApi, modelId, expressId) {
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