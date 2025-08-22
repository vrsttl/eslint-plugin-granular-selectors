module.exports = {
  plugins: ['./index.js'],
  rules: {
    'granular-selectors/granular-selectors': 'error'
  },
  env: {
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
};