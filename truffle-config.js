require('babel-register')
require('babel-polyfill')

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 9545,
      network_id: '*', // match any network
      skipDryRun: true,
      gas: 7000000
    },
    root: {
      host: 'localhost',
      port: 9545,
      network_id: '*', // match any network
      skipDryRun: true,
      gas: 7000000,
      gasPrice: '0'
    },
    child: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // match any network
      skipDryRun: true,
      gas: 7000000,
      gasPrice: '0'
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 21,
      outputFile: '/dev/null',
      showTimeSpent: true
    }
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: '0.6.6', // Fetch exact version from solc-bin (default: truffle's version)
      docker: true, // Use "0.5.1" you've installed locally with docker (default: false)
      parser: 'solcjs',
      settings: { // See the solidity docs for advice about optimization and evmVersion
        // optimizer: {
        //   enabled: false,
        //   runs: 200
        // }
        evmVersion: 'istanbul'
      }
    }
  }
}
