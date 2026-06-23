# IFC Extractor

Node.js библиотека для извлечения конструктивных элементов и подложек из IFC-моделей.

## Установка

```bash
npm install
```

## Использование

### Основная функция

```javascript
import { extractIFC } from './src/lib/ifcExtractor.js';

const result = await extractIFC('path/to/model.ifc');

console.log(result.structuralElements); // Конструктивные элементы
console.log(result.underlays);          // Подложки
```

### Результат

```javascript
{
  structuralElements: [
    {
      id: 123,
      type: 'IfcWall',
      name: 'WALL_01',
      position: { x: 0, y: 0, z: 0 },
      properties: { ... }
    }
  ],
  underlays: [
    {
      id: 456,
      type: 'IfcGrid',
      name: 'GRID_A',
      position: { x: 0, y: 0, z: 0 },
      properties: { ... }
    }
  ]
}
```

### Запуск через CLI

```bash
node src/index.js path/to/model.ifc
```

## Структура проекта

```
src/
├── lib/
│   └── ifcExtractor.js    # Основной модуль парсера
└── index.js               # Тестовый скрипт
```

## Очистка памяти

После извлечения данных Wasm-память автоматически очищается через `CloseModel()`.

## Типы элементов

### Конструктивные элементы
- `IfcWall` — стены
- `IfcSlab` — перекрытия
- `IfcBeam` — балки
- `IfcColumn` — колонны

### Подложки
- `IfcGrid` — сетки осей

## Следующие шаги

- Обернуть библиотеку в API-сервер (Express/Fastify)
- Добавить поддержку дополнительных типов элементов
- Реализовать кэширование загруженных моделей