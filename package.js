/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '4.2.1',
  summary: 'Node OAuth2 Server (v4) with Meteor bindings',
  git: 'https://github.com/ravitmg/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom(['1.6', '2.3'])
  api.use('ecmascript@0.12.7')
  api.mainModule('lib/oauth.js', 'server')
})

Npm.depends({
  '@node-oauth/oauth2-server': '4.2.0',
  'body-parser': '1.20.0'
})

Package.onTest(function (api) {
  api.use([
    'lmieulet:meteor-legacy-coverage',
    'lmieulet:meteor-coverage@3.2.0',
    'lmieulet:meteor-packages-coverage',
    'meteortesting:mocha@2.0.0'
  ])
  api.use('ecmascript')
  api.use('mongo')
  api.use('jkuester:http@2.1.0')
  api.use('dburles:mongo-collection-instances')
  api.use('accounts-base@2.0.0')
  api.use('accounts-password@2.0.0')
  api.use('practicalmeteor:chai')
  //  api.mainModule('oauth-tests.js', 'server')

  api.addFiles([
    'tests/error-tests.js',
    'tests/validation-tests.js',
    'tests/model-tests.js',
    'tests/webapp-tests.js',
    'tests/oauth-tests.js'
  ], 'server')
})
