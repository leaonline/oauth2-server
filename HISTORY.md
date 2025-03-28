# History

### 6.0.0
- Meteor 3 / Express compatibility
- added scope verification in authenticated routes
- improved internal logging
- fix bug in validation for custom models
- fix support for explicit `client.id` field

## 5.0.0
- sync support for @node-oauth/oauth2-server 5.x by

## 4.2.1
- this is a patch release, fixing a syntax error 
  (that never got picked up, due to wrong linter config)
  
### Code fixes

- fix(core): standard lint fixed
- fix(core): oauth.js fix wrong syntax error in import
  
### Dev fixes
  
- fix(ci): run npm setup before lint and test to link package
- fix(build): remove .coverage from git 
  (URLSearchParam missing s at the end)
- fix(tests): test project linter settings fixed
- fix(ci): remove dependencies from single job
- update(ci): test workflow update to use test project


## 4.2.0
- updated `@node-oauth/oauth2-server` to `4.2.0`
- correctly setup coverage for test project and package
- added documentation and generate docs via jsdoc2md (see [API.md](./API.md))
- fix(core): extracted initRoutes from OAuth2Server into standalone function to
  prevent re-init

## 4.1.0
- this version has not been released publicly and superseded by `4.2.0`
- removed `redirectUris` to find client (now searches only by clientId) in
  `createClient`
- hardened check failsafety in `UserValidation`
- hardened check against empty Strings in `requiredAccessTokenPostParams`,
  `requiredAuthorizeGetParams` and `requiredAuthorizePostParams`
- updated `@node-oauth/oauth2-server` to `4.1.1`

## 4.0.0
- use (actively maintained) @node-oauth/oauth2-server
- improve console output readability
- support Meteor versions `['1.6', '2.3']`; because 2.3 was a breaking release
- update tests to use latest Accounts and jkuester:http
- update follow redirect rules
- maybe-breaking due to update to Accounts 2.x

## 3.3.0

- updated `oauth2-server` to `4.0.0-dev.3`
- removed dependency to `dburles:mongo-collection-instances` (fix dependeny 
  issues with major accounts packages bumps)

## 3.2.1

- bumped `oauth2-server`

## 3.1.0 - 2019/10/09

- 

## 3.0.0 - 2019/10/01

**Summary**

- migrated to latest node oauth2 server (v3)
- wrap model in async Meteor environment
- use builtin `WebApp` instead of `express`
- built complete `authorization_code` workflow to make this usable with a custom `Accounts` package
- all routes fallback with an error handler to return the respective OAuth error 

**Commits**

- lint fix to comply standardjs
- oauth server implemented token handler and authenticated (token-required) routes
- model implemented token adapters
- model simplified logging
- model fixed getClient async access and logging behavior
- oauth fixed references to this via self property
- redirect after authorizazion success
- implement authorization stack
- fix saveAuthorizationCode
- model simplified functions and removed unneccesary Promises
- model saveAuthorizationCode conform with node2 server 3.x API
- model updated debug logging format
- reusable validation for client_id and redirect_url
- extended validation in POST authUrl
- extended error handler
- cleanup imports
- use facaded app that can be replaced if desired
- add input validation utils
- use get and post route for WebApp connect
- model im proved console.log
- improved error handling on auth route
- model improve debug messages
- introduced oauth app registration
- fixed lint errors
- model rewritten using promises
- update README
- removed express dependency and v3 compatibility
- extended model config and v3 compatibility
- decaffeinated project
- added .npm to gitignore


## 2.1.0 - 2019/07/11

- Support multiple `redirect_uri` #10

## 2.0.0 - 2016/01/08

- Rename all athorizedClients to authorizedClients (please update your users DB too)
- Allow `refresh_token` as a Grant Type
- Transform any requests to `/oauth/token` that is `POST` and isn't `application/x-www-form-urlencoded`, merging the body and the query strings. See [pull request #5](https://github.com/RocketChat/rocketchat-oauth2-server/pull/5) for more details.

## 1.4.0 - 2016/01/08

- Redirect user to `/oauth/error/404` instead of `/oauth/404`
- Redirect user to `/oauth/error/invalid_redirect_uri` if uri does not match

## 1.3.0 - 2016/01/08

- Redirect user to `/oauth/404` if client does not exists or is inactive

## 1.2.0 - 2016/01/07

- Return only clients with `active: true`

## 1.1.1 - 2015/01/06

- Only process errors for oauth routes

## 1.1.0 - 2015/01/05

- Allow pass collection object instead collection name

## 1.0.1 - 2015/12/31

- Added more debug logs

## 1.0.0 - 2015/12/31

- Initial implementation
