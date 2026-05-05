/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '6.0.0',
  summary: 'Node OAuth2 Server (v4) with Meteor bindings',
  git: 'https://github.com/leaonline/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom(['3.0', '3.4'])
  api.use('ecmascript')
  api.mainModule('lib/oauth.js', 'server')
})

Npm.depends({
  '@node-oauth/oauth2-server': '5.3.0',
  'body-parser': '2.2.2'
})

Package.onTest(function (api) {
  api.use([
    'meteortesting:mocha@3.3.0',
    'ecmascript',
    'mongo',
    'http',
    'accounts-base',
    'accounts-password'
  ])

  api.addFiles([
    'tests/error-tests.js',
    'tests/validation-tests.js',
    'tests/model-tests.js',
    'tests/webapp-tests.js',
    'tests/oauth-tests.js'
  ], 'server')
})
