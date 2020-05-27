/**
 * Добавляет указанные плагины в конфигурацию webpack.
 * @param {Object} config Объект конфигурации webpack.
 * @param {Array} plugins Массив плагинов.
 */
const addPlugins = (config, plugins) => ({
  ...config,
  plugins: [...(config.plugins || []), ...plugins],
});

module.exports = { addPlugins };
