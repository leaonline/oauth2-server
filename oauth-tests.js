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

    }
    const server = new OAuth2Server({serverOptions})
    assert.isDefined(server)
  })

  it('can be created with model', function () {
    const model = {}
    const server = new OAuth2Server({model})
    assert.isDefined(server)
  })

  it('can be created with routes', function () {
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

  it('creates a POT route for fallback', function () {
    assert.fail()
  })
})

describe('registerClient', function () {
  it('registers a new client', function () {
    assert.fail()
  })

  it('validates input parameters', function () {
    assert.fail()
  })
})

describe('OAuth2 workflow', function () {
  it('is not yet implemented', function () {
    assert.fail()
  })
})
