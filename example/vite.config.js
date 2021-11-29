import path from 'path'
import mpx, { addExtensionsPlugin } from '../dist/index'

export default {
  plugins: [
    mpx({
      env: 'didi'
    })
  ],
  resolve: {
    extensions: ['.mpx', '.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': path.resolve('.')
    }
  },
  build: {
    target: ['es2015'],
    sourcemap: true,
    minify: false
  }
}
