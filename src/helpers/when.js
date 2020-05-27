/**
 * Если условие истинно, возвращает указанное значение. В противном случае
 * возвращат либо пустой массив, либо пустой объект в зависимости от типа
 * значения.
 * @param {Boolean} condition Условие.
 * @param {Object|Array} value Значение.
 */
const when = (condition, value) => {
  const defaults = Array.isArray(value) ? [] : {};
  return condition ? value : defaults;
};

module.exports = { when };
