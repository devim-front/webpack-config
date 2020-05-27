const dotenv = require('dotenv');
const { filterEnv } = require('./filterEnv');

/**
 * Синхронно считывает коллекцию переменных окружения из указанного файла.
 * @param {String} file Абсолютный путь к файлу.
 */
const readEnv = (file) => filterEnv(dotenv.config({ path: file }).parsed || {});

module.exports = { readEnv };
