import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import bodyParser from 'body-parser';
import { extractIfc } from './lib/ifcExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = join(__dirname, '../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

let lastUploadedFile = null;
let lastFragFile = null;

let cachedElements = null;
let cachedElementsCount = 0;

async function loadPropertiesFromJson() {
  const propertiesPath = join(__dirname, '../public/properties.json');
  
  if (!existsSync(propertiesPath)) {
    return false;
  }
  
  try {
    const fileContent = readFileSync(propertiesPath, 'utf8');
    const propertiesData = JSON.parse(fileContent);
    
    cachedElements = propertiesData;
    cachedElementsCount = propertiesData.length;
    
    return true;
  } catch (e) {
    console.error('Ошибка загрузки properties.json:', e.message);
    return false;
  }
}

async function loadPropertiesFromFrag() {
  const fragPath = join(__dirname, '../public/model.frag');
  
  if (!existsSync(fragPath)) {
    return false;
  }
  
  return true;
}

setTimeout(async () => {
  const loadedFromJson = await loadPropertiesFromJson();
  
  if (!loadedFromJson) {
    const possiblePaths = [
      join(__dirname, '../test.ifc'),
      join(__dirname, '../small_test.ifc'),
      join(__dirname, '../public/test.ifc'),
      join(__dirname, '../uploads/model_1781855600689.ifc')
    ];
    
    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        try {
          const result = await extractIfc(filePath);
          cachedElements = [
            ...result.structuralElements,
            ...result.underlays
          ];
          cachedElementsCount = cachedElements.length;
          lastUploadedFile = `model_${Date.now()}.ifc`;
          const uploadPath = join(UPLOADS_DIR, lastUploadedFile);
          writeFileSync(uploadPath, readFileSync(filePath, 'utf8'));
          
          const propertiesPath = join(__dirname, '../public/properties.json');
          writeFileSync(propertiesPath, JSON.stringify(cachedElements, null, 2), 'utf8');
          
          break;
        } catch (e) {
        }
      }
    }
  }
  
  if (!cachedElements) {
    await loadPropertiesFromFrag();
  }
}, 100);

app.use(bodyParser.json({ limit: '200mb', strict: false }));
app.use(bodyParser.text({ limit: '200mb', type: 'text/plain' }));
app.use(express.static(join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.post('/api/upload', async (req, res) => {
  try {
    const fileContent = req.body;
    
    if (!fileContent || fileContent.length === 0) {
      res.status(400).json({ error: 'Файл не был загружен' });
      return;
    }

    const fileName = `model_${Date.now()}.ifc`;
    const filePath = join(UPLOADS_DIR, fileName);
    writeFileSync(filePath, fileContent, 'utf8');
    lastUploadedFile = fileName;

    const result = await extractIfc(filePath);
    
    cachedElements = [
      ...result.structuralElements,
      ...result.underlays
    ];
    cachedElementsCount = cachedElements.length;

    const propertiesPath = join(__dirname, '../public/properties.json');
    try {
      writeFileSync(propertiesPath, JSON.stringify(cachedElements, null, 2), 'utf8');
    } catch (err) {
      console.error('Ошибка сохранения properties.json:', err.message);
    }

    res.json({ 
      success: true,
      structuralElements: result.structuralElements,
      underlays: result.underlays
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка при обработке файла',
      details: error.message 
    });
  }
});

app.get('/api/model/file', (req, res) => {
  if (!lastUploadedFile) {
    res.status(404).json({ error: 'Файл не загружен' });
    return;
  }
  
  const filePath = join(UPLOADS_DIR, lastUploadedFile);
  res.sendFile(filePath);
});

app.get('/api/model/data', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  
  if (!cachedElements) {
    res.json({ 
      allElements: [], 
      total: 0, 
      page, 
      pageSize,
      totalPages: 0
    });
    return;
  }
  
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

app.get('/api/model/all-data', (req, res) => {
  if (!cachedElements) {
    res.json({ allElements: [] });
    return;
  }
  
  res.json({ allElements: cachedElements });
});

app.get('/api/model/fragments', (req, res) => {
  const filePath = join(__dirname, '../public/model.frag');
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Файл фрагментов не найден' });
  }
});

app.get('/api/model/properties', (req, res) => {
  const filePath = join(__dirname, '../public/properties.json');
  if (existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Файл свойств не найден' });
  }
});

app.post('/api/convert', async (req, res) => {
  try {
    const { ifcFilePath } = req.body;
    
    if (!ifcFilePath) {
      res.status(400).json({ error: 'Не указан путь к IFC файлу' });
      return;
    }
    
    const fullPath = join(__dirname, '../', ifcFilePath);
    
    if (!existsSync(fullPath)) {
      res.status(404).json({ error: 'IFC файл не найден' });
      return;
    }
    
    const { exec } = await import('child_process');
    const command = `node scripts/convert.js "${ifcFilePath}"`;
    
    exec(command, { cwd: join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ 
          error: 'Ошибка конвертации',
          details: error.message,
          stdout,
          stderr
        });
        return;
      }
      
      lastFragFile = 'model.frag';
      
      res.json({ 
        success: true,
        message: 'Конвертация завершена',
        stdout,
        stderr
      });
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Ошибка конвертации',
      details: error.message 
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Страница не найдена' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV === 'production' ? undefined : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
