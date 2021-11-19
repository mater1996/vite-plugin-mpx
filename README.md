# vite-plugin-mpx

[![NPM version](https://img.shields.io/npm/v/vite-plugin-mpx?color=a1b858&label=)](https://www.npmjs.com/package/vite-plugin-mpx)

## Install

```bash
npm install vite-plugin-mpx -D
```

```js
// vite.config.js
import mpx from 'vite-plugin-mpx'

export default {
  plugins: [mpx()],
  resolve: {
    extensions: ['.mpx', '.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  // If you use `@mpxjs/api-proxy`
  optimizeDeps: {
    exclude: ['@mpxjs/api-proxy'],
    include: ['axios']
  }
}
```

```js
import mpx from './app.mpx'
```

## Todo

- HotReload
- Sourcemap
- Packages
