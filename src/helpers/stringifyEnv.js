/**
 * Преобразует указанную коллекцию в формат, пригодный для безопасной
 * подстановки в исходный код.
 * @param {Object} env Коллекция переменных окружения.
 */
const stringifyEnv = (env) =>
  Object.keys(env).reduce(
    (result, key) => ({
      ...result,
      [`process.env.${key}`]: JSON.stringify(env[key]),
    }),
    {}
  );

module.exports = { stringifyEnv };
