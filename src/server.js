import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import bodyParser from 'body-parser';
import { extractIFC } from './lib/ifcExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Папка для сохранения файлов
const UPLOADS_DIR = join(__dirname, '../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

// Хранение имени последнего загруженного файла
let lastUploadedFile = null;

// Хранение имени последнего сконвертированного .frag файла
let lastFragFile = null;

// Кэш для хранения данных о всех элементах
let cachedElements = null;
let cachedElementsCount = 0;

/**
 * Загружает свойства из сконвертированного JSON файла
 */
async function loadPropertiesFromJson() {
  const propertiesPath = join(__dirname, '../public/properties.json');
  
  if (!existsSync(propertiesPath)) {
    console.log('ℹ️ Файл properties.json не найден');
    return false;
  }
  
  try {
    const fileContent = readFileSync(propertiesPath, 'utf8');
    const propertiesData = JSON.parse(fileContent);
    
    cachedElements = propertiesData;
    cachedElementsCount = propertiesData.length;
    
    console.log(`✅ Загружено свойств из properties.json: ${cachedElementsCount} элементов`);
    return true;
  } catch (e) {
    console.error('❌ Ошибка загрузки properties.json:', e.message);
    return false;
  }
}

/**
 * Загружает свойства из .frag файла (используется как резервный способ)
 */
async function loadPropertiesFromFrag() {
  const fragPath = join(__dirname, '../public/model.frag');
  
  if (!existsSync(fragPath)) {
    console.log('ℹ️ Файл model.frag не найден');
    return false;
  }
  
  console.log('ℹ️ Файл properties.json не найден, загрузка будет производиться по запросу...');
  return true;
}

// Инициализируем при старте (в фоне, не блокируя запуск сервера)
setTimeout(async () => {
  // Сначала пытаемся загрузить из JSON
  const loadedFromJson = await loadPropertiesFromJson();
  
  // Если JSON не найден, загружаем из IFC файла
  if (!loadedFromJson) {
    const possiblePaths = [
      join(__dirname, '../test.ifc'),
      join(__dirname, '../small_test.ifc'),
      join(__dirname, '../public/test.ifc'),
      join(__dirname, '../uploads/model_1781855600689.ifc')
    ];
    
    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        console.log(`🔍 Найден стартовый файл: ${basename(filePath)}`);
        try {
          const result = await extractIFC(filePath);
          cachedElements = [
            ...result.structuralElements,
            ...result.underlays
          ];
          cachedElementsCount = cachedElements.length;
          lastUploadedFile = `model_${Date.now()}.ifc`;
          const uploadPath = join(UPLOADS_DIR, lastUploadedFile);
          const fs = await import('fs');
          fs.writeFileSync(uploadPath, fs.readFileSync(filePath, 'utf8'));
          
          // Сохраняем свойства в properties.json при инициализации
          const propertiesPath = join(__dirname, '../public/properties.json');
          writeFileSync(propertiesPath, JSON.stringify(cachedElements, null, 2), 'utf8');
          console.log(`✅ Свойства сохранены в: ${propertiesPath}`);
          
          console.log(`✅ Стартовый файл загружен: ${cachedElementsCount} элементов`);
          break;
        } catch (e) {
          console.warn(`⚠️ Не удалось загрузить ${basename(filePath)}:`, e.message);
        }
      }
    }
  }
  
  // Если все еще не загружено, проверяем .frag файл
  if (!cachedElements) {
    await loadPropertiesFromFrag();
  }
}, 100);

// Мидлвары с увеличенным лимитом для больших IFC файлов
app.use(bodyParser.json({ limit: '200mb', strict: false }));
app.use(bodyParser.text({ limit: '200mb', type: 'text/plain' }));
app.use(express.static(join(__dirname, '../public')));

// Отдача worker.mjs с правильным Content-Type
app.get('/worker.mjs', (req, res) => {
  const filePath = join(__dirname, '../public/worker.mjs');
  if (existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Worker файл не найден' });
  }
});

/**
 * GET / - Отдача index.html
 */
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

/**
 * POST /api/upload - Парсинг и сохранение IFC-файла
 */
app.post('/api/upload', async (req, res) => {
  try {
    const fileContent = req.body;
    
    if (!fileContent || fileContent.length === 0) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    // Сохраняем файл
    const fileName = `model_${Date.now()}.ifc`;
    const filePath = join(UPLOADS_DIR, fileName);
    writeFileSync(filePath, fileContent, 'utf8');
    lastUploadedFile = fileName;

    // Используем модуль ifcExtractor для извлечения данных
    const result = await extractIFC(filePath);
    
    // Кэшируем все элементы ( structuralElements + underlays )
    cachedElements = [
      ...result.structuralElements,
      ...result.underlays
    ];
    cachedElementsCount = cachedElements.length;

    console.log(`✅ Файл загружен и обработан: ${fileName}`);
    console.log(`   Структурных элементов: ${result.structuralElements.length}`);
    console.log(`   Подложек: ${result.underlays.length}`);
    console.log(`   Всего элементов: ${cachedElementsCount}`);

    // Сохраняем свойства в properties.json
    const propertiesPath = join(__dirname, '../public/properties.json');
    try {
      writeFileSync(propertiesPath, JSON.stringify(cachedElements, null, 2), 'utf8');
      console.log(`✅ Свойства сохранены в: ${propertiesPath}`);
    } catch (err) {
      console.error(`❌ Ошибка сохранения properties.json: ${err.message}`);
    }

    res.json({ 
      success: true,
      structuralElements: result.structuralElements,
      underlays: result.underlays
    });

  } catch (error) {
    console.error('Ошибка при парсинге IFC:', error);
    res.status(500).json({ 
      error: 'Ошибка при обработке файла',
      details: error.message 
    });
  }
});

/**
 * GET /api/model/file - Отдача последнего загруженного IFC-файла
 */
app.get('/api/model/file', (req, res) => {
  if (!lastUploadedFile) {
    return res.status(404).json({ error: 'Файл не загружен' });
  }
  
  const filePath = join(UPLOADS_DIR, lastUploadedFile);
  res.sendFile(filePath);
});

/**
 * GET /api/model/data - Информация об элементах (с пагинацией)
 */
app.get('/api/model/data', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  
  if (!cachedElements) {
    return res.json({ 
      allElements: [], 
      total: 0, 
      page, 
      pageSize,
      totalPages: 0
    });
  }
  
  // Пагинация
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedElements = cachedElements.slice(start, end);
  const totalPages = Math.ceil(cachedElementsCount / pageSize);

  res.json({ 
    allElements: paginatedElements,
    total: cachedElementsCount,
    page,
    pageSize,
    totalPages
  });
});

/**
 * GET /api/model/all-data - Все элементы сразу (без пагинации)
 */
app.get('/api/model/all-data', (req, res) => {
  if (!cachedElements) {
    return res.json({ allElements: [] });
  }
  
  res.json({ allElements: cachedElements });
});

/**
 * GET /api/model/fragments - Отдача .frag файла с геометрией
 */
app.get('/api/model/fragments', (req, res) => {
  const filePath = join(__dirname, '../public/model.frag');
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Файл фрагментов не найден' });
  }
});

/**
 * GET /api/model/properties - Отдача .json файла со свойствами
 */
app.get('/api/model/properties', (req, res) => {
  const filePath = join(__dirname, '../public/properties.json');
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Файл свойств не найден' });
  }
});

/**
 * POST /api/convert - Конвертация IFC файла в Fragments
 */
app.post('/api/convert', async (req, res) => {
  try {
    const { ifcFilePath } = req.body;
    
    if (!ifcFilePath) {
      return res.status(400).json({ error: 'Не указан путь к IFC файлу' });
    }
    
    const fullPath = join(__dirname, '../', ifcFilePath);
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'IFC файл не найден' });
    }
    
    // Запускаем конвертацию через child_process
    const { exec } = await import('child_process');
    const command = `node scripts/convert.js "${ifcFilePath}"`;
    
    exec(command, { cwd: join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('Ошибка конвертации:', error);
        return res.status(500).json({ 
          error: 'Ошибка конвертации',
          details: error.message,
          stdout,
          stderr
        });
      }
      
      console.log('Конвертация завершена:', stdout);
      lastFragFile = 'model.frag';
      
      res.json({ 
        success: true,
        message: 'Конвертация завершена',
        stdout,
        stderr
      });
    });
    
  } catch (error) {
    console.error('Ошибка при конвертации:', error);
    res.status(500).json({ 
      error: 'Ошибка конвертации',
      details: error.message 
    });
  }
});

/**
 * Обработчик ошибок 404
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Страница не найдена' });
});

/**
 * Общий обработчик ошибок
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'production' ? undefined : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});