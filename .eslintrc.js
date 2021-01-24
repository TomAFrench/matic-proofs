module.exports = {
  extends: "airbnb-typescript-prettier",
  parser: "@typescript-eslint/parser",
  parserOptions: {
      "project": "./tsconfig.json",
      "tsconfigRootDir": __dirname,
      "sourceType": "module"
  },
  env: {
    node: true,
    es6: true,
    mocha: true
  },
  globals: {
    contract: true,
    web3: true,
    assert: true
  },
  rules: {
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "js": "never",
        "ts": "never"
      }
    ],
    "import/no-extraneous-dependencies": ["error", {"devDependencies": ["hardhat.config.ts", "test/**/*", "deploy/**/*"]}],
    "import/prefer-default-export": "off",
    "prefer-destructuring": "off",
    "prefer-template": "off",
  }
}
