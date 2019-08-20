/* eslint-env meteor */
Package.describe({
  name: 'leaonline:oauth2-server',
  version: '3.0.0',
  summary: 'OAuth 2 Server package',
  git: 'https://github.com/leaonline/oauth2-server.git'
})

Package.onUse(function (api) {
  api.versionsFrom('1.0')
  api.use('ecmascript')
  api.mainModule('oauth.js', 'server')
})

Npm.depends({
  'oauth2-server': '3.0.0',
  'body-parser': '1.19.0'
})
