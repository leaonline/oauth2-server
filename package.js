/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '6.0.0-rc.1',
  summary: 'Node OAuth2 Server (v4) with Meteor bindings',
  git: 'https://github.com/leaonline/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom(['3.0'])
  api.use('ecmascript')
  api.mainModule('lib/oauth.js', 'server')
})

Npm.depends({
  '@node-oauth/oauth2-server': '5.2.0',
  'body-parser': '1.20.3'
})

Package.onTest(function (api) {
  api.use([
    // FIXME: include, once we have a working coverage for Meteor 3
    // 'lmieulet:meteor-legacy-coverage@0.4.0',
    // 'lmieulet:meteor-coverage@4.3.0',
    'meteortesting:mocha@3.2.0'
  ])
  api.use('ecmascript')
  api.use('mongo')
  api.use('jkuester:http@2.1.0')
  api.use('dburles:mongo-collection-instances@1.0.0')
  api.use('accounts-base')
  api.use('accounts-password')

  api.addFiles([
    'tests/error-tests.js',
    'tests/validation-tests.js',
    'tests/model-tests.js',
    'tests/webapp-tests.js',
    'tests/oauth-tests.js'
  ], 'server')
})
