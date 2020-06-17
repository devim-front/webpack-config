/**
 * Возвращает путь до файла, включая замыкающий слеш (то есть, для пути
 * 'js/[contenthash].js' функция вернёт 'js/'). Если путь не указан, вернёт
 * пустую строку.
 * @param {String} path Путь.
 */
const getFolder = (path) => {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.substr(0, index + 1);
};

module.exports = { getFolder };
