/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { assert } from 'chai'
import { Random } from 'meteor/random'
import { Accounts } from 'meteor/accounts-base'
import { HTTP } from 'meteor/jkuester:http'
import { OAuth2Server } from '../lib/oauth'
import { OAuth2ServerDefaults } from '../lib/defaults'
import { OAuthMeteorModel } from '../lib/model/model'
import { DefaultModelConfig } from '../lib/model/DefaultModelConfig'
import { assertCollection } from './test-helpers.tests'

describe('constructor', function () {
  it('can be instantiated without any parameter', function () {
    const server = new OAuth2Server()
    assert.isDefined(server)
    assert.deepEqual(server.config.serverOptions, OAuth2ServerDefaults.serverOptions)
    assert.deepEqual(server.config.model, OAuth2ServerDefaults.model)
    assert.deepEqual(server.config.routes, OAuth2ServerDefaults.routes)

    const model = new OAuthMeteorModel()
    assert.deepEqual(server.model, model)
  })

  it('can be created with serverOptions', function () {
    const serverOptions = OAuth2ServerDefaults.serverOptions
    const server = new OAuth2Server({ serverOptions })
    assert.isDefined(server)
    assert.isDefined(server.config)
    assert.isDefined(server.model)
    assert.deepEqual(server.config.serverOptions, serverOptions)
  })

  it('throws if server options include properties that are not in schema', function () {
    assert.throws(function () {
      (() => new OAuth2Server({ serverOptions: { foo: 'bar' } }))()
    })
  })

  it('can be created with custom config for default model', function () {
    const model = { authCodesCollectionName: 'ourCustomAuthCodes' }
    const server = new OAuth2Server({ model })
    assert.isDefined(server)
    assertCollection(model.authCodesCollectionName)
  })

  it('can be created with a custom model', function () {
    const model = {
      getAccessToken: async () => true,
      getAuthorizationCode: async () => true,
      getClient: async () => true,
      getRefreshToken: async () => true,
      revokeAuthorizationCode: async () => true,
      saveAuthorizationCode: async () => true,
      saveRefreshToken: async () => true,
      saveToken: async () => true,
      revokeToken: async () => true
    }
    const server = new OAuth2Server({ model })
    assert.isDefined(server)
    assert.deepEqual(server.model, model)
  })

  it('can be created with custom routes', function () {
    const routes = {
      authorizeUrl: '/oauth/authorization'
    }
    const server = new OAuth2Server({ routes })
    assert.deepEqual(server.config.routes, Object.assign({}, OAuth2ServerDefaults.routes, routes))
  })
})

describe('integration tests of OAuth2 workflows', function () {
  describe('Authorization code workflow', function () {
    const routes = {
      accessTokenUrl: `/${Random.id()}`,
      authorizeUrl: `/${Random.id()}`,
      errorUrl: `/${Random.id()}`,
      fallbackUrl: `/${Random.id()}`
    }

    const debug = false
    const logErrors = false
    const authCodeServer = new OAuth2Server({ debug, model: { debug }, routes })

    const get = (url, params, cb) => new Promise((resolve, reject) => {
      const fullUrl = Meteor.absoluteUrl(url)
      HTTP.get(fullUrl, params, (err, res) => {
        if (err && logErrors) return reject(err)
        try {
          cb(res)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

    const post = (url, params, cb) => new Promise((resolve, reject) => {
      const fullUrl = Meteor.absoluteUrl(url)
      HTTP.post(fullUrl, params, (err, res) => {
        if (err && logErrors) return reject(err)
        try {
          cb(res)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

    let ClientCollection
    let clientDoc
    let user

    beforeEach(async function () {
      ClientCollection = Mongo.Collection.get(DefaultModelConfig.clientsCollectionName)
      const clientDocId = await authCodeServer.registerClient({
        title: Random.id(),
        redirectUris: [Meteor.absoluteUrl(`/${Random.id()}`)],
        grants: ['authorization_code']
      })
      clientDoc = await ClientCollection.findOneAsync(clientDocId)
      assert.isDefined(clientDoc)

      // for the user we are faking the
      // login token to simulare a user, that is
      // currently logged in
      const userId = await Accounts.createUserAsync({ username: Random.id(), password: Random.id() })
      const token = Random.id()
      const hashedToken = Accounts._hashLoginToken(token)
      await Meteor.users.updateAsync(userId, {
        $set: {
          token: token,
          'services.resume.loginTokens.hashedToken': hashedToken
        }
      })
      user = await Meteor.users.findOneAsync(userId)
    })

    describe('Authorization Request', function () {
      it('returns a valid response for a valid request', async () => {
        const params = {
          client_id: clientDoc.clientId,
          response_type: 'code',
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id()
        }
        await get(routes.authorizeUrl, { params }, res => {
          assert.equal(res.statusCode, 200)
          assert.equal(res.data, null)
        })
      })

      it('returns an invalid_request error for invalid formed requests', async () => {
        const params = { state: Random.id() }
        await get(routes.authorizeUrl, { params }, (res) => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'invalid_request')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns unsupported_response_type if the response method is not supported by the server', async () => {
        const params = {
          client_id: clientDoc.clientId,
          response_type: Random.id(),
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id()
        }
        await get(routes.authorizeUrl, { params }, res => {
          assert.equal(res.statusCode, 415)
          assert.equal(res.data.error, 'unsupported_response_type')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an unauthorized_client error for invalid clients', async () => {
        const params = {
          client_id: Random.id(),
          response_type: 'code',
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id()
        }
        await get(routes.authorizeUrl, { params }, (res) => {
          assert.equal(res.statusCode, 401)
          assert.equal(res.data.error, 'unauthorized_client')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an invalid_request on invalid redirect_uri', async () => {
        const invalidRedirectUri = Meteor.absoluteUrl(`/${Random.id()}`)
        const params = {
          client_id: clientDoc.clientId,
          response_type: 'code',
          redirect_uri: invalidRedirectUri,
          state: Random.id()
        }
        await get(routes.authorizeUrl, { params }, (res) => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'invalid_request')
          assert.equal(res.data.error_description, `Invalid redirection uri ${invalidRedirectUri}`)
          assert.equal(res.data.state, params.state)
        })
      })
    })

    describe('Authorization Response', function () {
      [true, false].forEach(followRedirects => {
        it(`issues an authorization code and delivers it to the client via redirect follow=${followRedirects}`, async () => {
          const params = {
            client_id: clientDoc.clientId,
            response_type: 'code',
            redirect_uri: clientDoc.redirectUris[0],
            state: Random.id(),
            token: user.token,
            allowed: undefined
          }

          // depending on our fetch options we either immediately follow the
          // redirect and expect a 200 repsonse or, if we don't follow,
          // we expect a 302 response with location header, which can be used
          // by the client to manually follow
          await post(routes.authorizeUrl, { params, followRedirects }, res => {
            if (followRedirects) {
              assert.equal(res.statusCode, 200)
              assert.equal(res.headers.location, undefined)
            } else {
              assert.equal(res.statusCode, 302)

              const location = res.headers.location.split('?')
              assert.equal(location[0], clientDoc.redirectUris[0])

              const queryParamsRegex = new RegExp(`code=.+&user=${user._id}&state=${params.state}`, 'g')
              assert.isTrue(queryParamsRegex.test(location[1]))
            }
          })
        })
      })

      it('returns an access_denied error when no user exists for the given token', async () => {
        const params = {
          client_id: clientDoc.clientId,
          response_type: 'code',
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id(),
          token: Random.id(),
          allowed: undefined
        }
        await post(routes.authorizeUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'access_denied')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an access_denied error when the user denied the request', async () => {
        const params = {
          client_id: clientDoc.clientId,
          response_type: 'code',
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id(),
          token: user.token,
          allowed: 'false'
        }
        await post(routes.authorizeUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'access_denied')
          assert.equal(res.data.state, params.state)
        })
      })
    })

    describe('Access Token Request', function () {
      it('returns an invalid_request error on missing credentials', async () => {
        const params = {
          state: Random.id()
        }
        await post(routes.accessTokenUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'invalid_request')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an invalid_request error if the redirect uri is not correct', async function () {
        const authorizationCode = Random.id()
        const expiresAt = new Date(new Date().getTime() + 30000)
        await authCodeServer.model.saveAuthorizationCode({
          authorizationCode,
          expiresAt,
          redirectUri: clientDoc.redirectUris[0]
        }, { client_id: clientDoc.clientId }, { id: user._id })

        const params = {
          code: authorizationCode,
          client_id: clientDoc.clientId,
          client_secret: clientDoc.secret,
          redirect_uri: Random.id(),
          state: Random.id(),
          grant_type: 'authorization_code'
        }

        await post(routes.accessTokenUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'unauthorized_client')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an unauthorized_client error when the client does not provide a secret', async () => {
        const authorizationCode = Random.id()
        const expiresAt = new Date(new Date().getTime() + 30000)
        await authCodeServer.model.saveAuthorizationCode({
          authorizationCode,
          expiresAt,
          redirectUri: clientDoc.redirectUris[0]
        }, {}, { id: user._id })

        const params = {
          code: authorizationCode,
          client_id: clientDoc.clientId,
          client_secret: Random.id(),
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id(),
          grant_type: 'authorization_code'
        }

        await post(routes.accessTokenUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'unauthorized_client')
          assert.equal(res.data.error_description, 'Invalid client: client is invalid')
          assert.equal(res.data.state, params.state)
        })
      })

      it('returns an unauthorized_client error when the given code is not found', async () => {
        const params = {
          code: Random.id(),
          client_id: clientDoc.clientId,
          client_secret: clientDoc.secret,
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id(),
          grant_type: 'authorization_code'
        }

        await post(routes.accessTokenUrl, { params }, res => {
          assert.equal(res.statusCode, 400)
          assert.equal(res.data.error, 'unauthorized_client')
          assert.equal(res.data.error_description, 'Invalid grant: authorization code is invalid')
          assert.equal(res.data.state, params.state)
        })
      })
    })

    describe('Access Token Response', function () {
      it('issues an access token for a valid request', async () => {
        const authorizationCode = Random.id()
        const expiresAt = new Date(new Date().getTime() + 30000)
        await authCodeServer.model.saveAuthorizationCode({
          authorizationCode,
          expiresAt,
          redirectUri: clientDoc.redirectUris[0]
        }, {}, { id: user._id })

        const params = {
          code: authorizationCode,
          client_id: clientDoc.clientId,
          client_secret: clientDoc.secret,
          redirect_uri: clientDoc.redirectUris[0],
          state: Random.id(),
          grant_type: 'authorization_code'
        }

        await post(routes.accessTokenUrl, { params }, res => {
          assert.equal(res.statusCode, 200)

          const headers = res.headers
          assert.equal(headers['content-type'].includes('application/json'), true)
          assert.equal(headers['cache-control'], 'no-store')
          assert.equal(headers.pragma, 'no-cache')

          const body = res.data
          assert.isDefined(body.access_token)
          assert.isDefined(body.expires_in)
          assert.isDefined(body.refresh_token)
        })
      })
    })
  })
})
