import mpx from '../dist/index'

export default {
  plugins: [
    mpx({
      env: 'honghu'
    })
  ],
  resolve: {
    extensions: ['.mpx', '.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  build: {
    target: ['es2015'],
    sourcemap: true,
    minify: false
  }
}
