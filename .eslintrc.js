module.exports = {
  parser: 'babel-eslint',
  extends: ['airbnb/base', "plugin:prettier/recommended"],
  env: {
    node: true,
    es6: true,
    mocha: true
  },
  globals: {
    contract: true,
    web3: true,
    assert: true
  }
}
