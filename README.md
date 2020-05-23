# Devim Front: Webpack config

Конфигурация Webpack для проектов на TS+React.

## Установка

1. Подключите библиотеку в dev-зависимости проекта:

```bash
npm i -D @devim-front/webpack-config
```

2. Создайте файл `webpack.config.js` в корне своего проекта со следующим содержанием:

```javascript
const { createConfig } = require('@devim-front/webpack-config');

module.exports = (env, args) => createConfig(env, args, {
  rootPath: __dirname,
});
```

3. Создайте файл `tsconfig.json` в корне своего проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/tsconfig](https://www.npmjs.com/package/@devim-front/tsconfig).

4. Создайте файл `.babelrc` в корне своего проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/babel-config](https://www.npmjs.com/package/@devim-front/babel-config).

5. Создайте файл `.postcssrc.js` в корне проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/postcss-config](https://www.npmjs.com/package/@devim-front/postcss-config).
