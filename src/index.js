const { extractIfc } = require('./lib/ifcExtractor.js');

async function main() {
  const filePath = process.argv[2] || 'test.ifc';

  console.log(`Запуск парсера IFC файла: ${filePath}`);
  console.log('');

  try {
    const result = await extractIfc(filePath);

    console.log('Парсинг завершен успешно!');
    console.log('');
    console.log('Результаты:');
    console.log(`   Конструктивные элементы: ${result.structuralElements.length}`);
    console.log(`   Подложки: ${result.underlays.length}`);
    console.log('');

    if (result.structuralElements.length > 0) {
      console.log('Конструктивные элементы:');
      result.structuralElements.forEach((el, index) => {
        console.log(`   ${index + 1}. [${el.type}] ${el.name} (ID: ${el.id})`);
        if (el.position) {
          console.log(`      Позиция: (${el.position.x}, ${el.position.y}, ${el.position.z})`);
        }
        if (Object.keys(el.properties).length > 0) {
          console.log(`      Свойства: ${Object.keys(el.properties).length} значений`);
        }
      });
    }

    if (result.underlays.length > 0) {
      console.log('');
      console.log('Подложки:');
      result.underlays.forEach((el, index) => {
        console.log(`   ${index + 1}. [${el.type}] ${el.name} (ID: ${el.id})`);
      });
    }

    console.log('');
    console.log('Данные сохранены в result.json');
    
    const fs = require('fs');
    fs.writeFileSync('result.json', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Ошибка при парсинге файла:');
    console.error(error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.error('');
      console.error('Попробуйте указать путь к IFC-файлу:');
      console.error('   node src/index.js path/to/file.ifc');
    }
    
    process.exit(1);
  }
}

main();