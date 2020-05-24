# Devim Front: Webpack config

Конфигурация Webpack для проектов на TS+React.

## Установка

1. Подключите неявные dev-зависимости проекта (если они ещё не были установлены):

```bash
npm i -D webpack typesciprt @babel/core
```

2. Подключите библиотеку в dev-зависимости проекта:

```bash
npm i -D @devim-front/webpack-config
```

3. Создайте файл `webpack.config.js` в корне своего проекта со следующим содержанием:

```javascript
const { createConfig } = require('@devim-front/webpack-config');

module.exports = (env, args) =>
  createConfig(env, args, {
    rootPath: __dirname,
  });
```

Полный список настроек для `createConfig` читайте ниже.

4. Создайте файл `tsconfig.json` в корне своего проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/tsconfig](https://www.npmjs.com/package/@devim-front/tsconfig).

5. Создайте файл `.babelrc` в корне своего проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/babel-config](https://www.npmjs.com/package/@devim-front/babel-config).

6. Создайте файл `.postcssrc.js` в корне проекта. Рекомендуется использовать общую конфигурацию из пакета [@devim-front/postcss-config](https://www.npmjs.com/package/@devim-front/postcss-config).
