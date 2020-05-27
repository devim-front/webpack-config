/**
 * Возвращает лишь те переменные окружения из указанной коллекции, имя которых
 * начинается с префикса APP_*, а также переменную NODE_ENV.
 * @param {Object} env Коллекция переменных окружения.
 */
const filterEnv = (env) =>
  Object.keys(env).reduce(
    (previous, key) =>
      key === 'NODE_ENV' || /^APP_\w+$/.test(key)
        ? { ...previous, [key]: env[key] }
        : previous,
    {}
  );

module.exports = { filterEnv };
