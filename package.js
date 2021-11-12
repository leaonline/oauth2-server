/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '4.0.0',
  summary: 'OAuth 2 Server (v3) with Meteor bindings',
  git: 'https://github.com/leaonline/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom(['1.6', '2.3'])
  api.use('ecmascript@0.12.7')
  api.mainModule('oauth.js', 'server')
})

Npm.depends({
  '@node-oauth/oauth2-server': '4.1.0',
  'body-parser': '1.19.0'
})

Package.onTest(function (api) {
  api.use('ecmascript')
  api.use('mongo')
  api.use('jkuester:http@2.1.0')
  api.use('dburles:mongo-collection-instances')
  api.use('meteortesting:mocha')
  api.use('accounts-base@2.0.0')
  api.use('accounts-password@2.0.0')
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
