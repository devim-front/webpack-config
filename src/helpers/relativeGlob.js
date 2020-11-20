const path = require('path');

/**
 * Преобразует относительный путь из параметра from в параметр to с
 * использованием формата, пригодного для безопасной работы glob-маск.
 * @param {String} from Исходный путь.
 * @param {String} to Целевой путь.
 */
const relativeGlob = (from, to) => path.relative(from, to).replace(/\\/g, '/');

module.exports = { relativeGlob };
