/* eslint-env mocha */
import { assert } from 'meteor/practicalmeteor:chai'
import { OAuth2Server } from './oauth'

describe('constructor', function () {
  it('can be instantiated without any parameter', function () {
    const server = new OAuth2Server()
    assert.isDefined(server)
  })

  it('can be created with serverOptions', function () {
    const serverOptions = {
      addAcceptedScopesHeader: true,
      addAuthorizedScopesHeader: true,
      allowBearerTokensInQueryString: false,
      allowEmptyState: false,
      authorizationCodeLifetime: 300,
      accessTokenLifetime: 3600,
      refreshTokenLifetime: 1209600,
      allowExtendedTokenAttributes: false,
      requireClientAuthentication: true
    }
    const server = new OAuth2Server({serverOptions})
    assert.isDefined(server)
    assert.isDefined(server.config)
    assert.isDefined(server.model)
    assert.equal(server.config.serverOptions, serverOptions)
  })

  it ('throws if server options include properties that are not in schema', function () {
    assert.fail()
  })
  
  it ('can be created with custom config for default model', function () {
    
  })

  it('can be created with a custom model', function () {
    const model = {
      getAccessToken: function() {
        return new Promise('works!');
      }
    }
    const server = new OAuth2Server({ model })
    assert.isDefined(server)
    assert.deepEqual(server.model, model)
  })

  it('can be created with custom routes', function () {
    assert.fail()
  })
})

describe('publishAuthorizedClients', function () {
  it('publishes authorized clients by default for the current user', function () {
    assert.fail()
  })

  it('does not publish any authorized client for non-logged-in users', function () {
    assert.fail()
  })
})

describe('initRoutes', function () {
  it('creates a GET route for the accessTokenUrl', function () {
    assert.fail()
  })

  it('creates a POST route for the accessTokenUrl', function () {
    assert.fail()
  })

  it('creates a GET route for the authorizeUrl', function () {
    assert.fail()
  })

  it('creates a POST route for the authorizeUrl', function () {
    assert.fail()
  })

  it('creates a GET route for fallback', function () {
    assert.fail()
  })

  it('creates a POST route for fallback', function () {
    assert.fail()
  })
})

describe('registerClient', function () {

  it('validates input parameters', function () {
    assert.fail()
  })
})

describe('workflows', function () {
  describe('authorization code', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })
})
