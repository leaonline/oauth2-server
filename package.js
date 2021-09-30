/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '3.3.0',
  summary: 'OAuth 2 Server (v3) with Meteor bindings',
  git: 'https://github.com/leaonline/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom('1.0')
  api.use('ecmascript@0.12.7')
  api.mainModule('oauth.js', 'server')
})

Npm.depends({
  'oauth2-server': '4.0.0-dev.3',
  'body-parser': '1.19.0'
})

Package.onTest(function (api) {
  api.use('ecmascript')
  api.use('mongo')
  api.use('dburles:mongo-collection-instances')
  api.use('meteortesting:mocha')
  api.use('accounts-base')
  api.use('accounts-password')
  api.use('practicalmeteor:chai')
  //  api.mainModule('oauth-tests.js', 'server')

  api.addFiles([
    'error-tests.js',
    'validation-tests.js',
    'model-tests.js',
    'webapp-tests.js',
    'oauth-tests.js'
  ], 'server')
})
