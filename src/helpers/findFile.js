const path = require('path');
const fs = require('fs');

/**
 * Осуществляет поиск в указанном каталоге файла с заданным именем и имеющего
 * одно из перечисленных расширений. Если такой файл найден, возвращает
 * абсолютный путь к этому файлу, в противном случае - undefined.
 * @param {String} folder Абсолютный путь к каталогу.
 * @param {Array} extensions Массив допустимых расширений файла.
 * @param {String} name Имя файла без расширения.
 */
const findFile = (folder, extensions, name) =>
  extensions
    .map((ext) => path.resolve(folder, `${name}${ext}`))
    .find(fs.existsSync);

module.exports = { findFile };
