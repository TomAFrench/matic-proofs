module.exports = {
  parser: 'babel-eslint',
  extends: 'airbnb/base',
  env: {
    node: true,
    es6: true,
    mocha: true
  },
  rules: {
    'space-before-function-paren': ['error', 'never']
  },
  globals: {
    contract: true,
    web3: true,
    assert: true
  }
}
