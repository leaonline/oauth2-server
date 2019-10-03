import { Random } from 'meteor/random'
import { assert } from 'meteor/practicalmeteor:chai'
import { Model, DefaultModelConfig } from './model'

const GrantTypes = {
  authorization_code: 'authorization_code',
  client_credentials: 'client_credentials',
  implicit: 'implicit',
  refresh_token: 'refresh_token',
  password: 'password'
}

const assertCollection = name => {
  const collection = Mongo.Collection.get(name)
  assert.isDefined(collection)
  assert.equal(collection.constructor.name, 'Collection')
}


const dropCollection = name => {
  const collection = Mongo.Collection.get(name)
  if (collection) {
    collection._rawCollection().drop()
  }
}

describe('model', function () {

  let randomAccessTokenName = Random.id()
  let randomRefreshTokenName = Random.id()
  let randomAuthCodeName = Random.id()
  let randomClientsName = Random.id()

  beforeEach(function () {
    randomAccessTokenName = Random.id()
    randomRefreshTokenName = Random.id()
    randomAuthCodeName = Random.id()
    randomClientsName = Random.id()
  })


  describe('constructor', function () {

    it('can be created with defaults', function () {
      assert.isDefined(new Model())
      assertCollection(DefaultModelConfig.accessTokensCollectionName)
      assertCollection(DefaultModelConfig.refreshTokensCollectionName)
      assertCollection(DefaultModelConfig.authCodesCollectionName)
      assertCollection(DefaultModelConfig.clientsCollectionName)
    })

    it('can be created with custom collection names', function () {
      assert.isDefined(new Model({
        accessTokensCollectionName: randomAccessTokenName,
        refreshTokensCollectionName: randomRefreshTokenName,
        authCodesCollectionName: randomAuthCodeName,
        clientsCollectionName: randomClientsName
      }))
      assertCollection(randomAccessTokenName)
      assertCollection(randomRefreshTokenName)
      assertCollection(randomAuthCodeName)
      assertCollection(randomClientsName)
    })

    it('can be created with custom collections passed', function () {
      const AccessTokens = new Mongo.Collection(randomAccessTokenName)
      const RefreshTokens = new Mongo.Collection(randomRefreshTokenName)
      const AuthCodes = new Mongo.Collection(randomAuthCodeName)
      const Clients = new Mongo.Collection(randomClientsName)
      assert.isDefined(new Model({
        accessTokensCollection: AccessTokens,
        refreshTokensCollection: RefreshTokens,
        authCodesCollection: AuthCodes,
        clientsCollection: Clients
      }))
      assertCollection(randomAccessTokenName)
      assertCollection(randomRefreshTokenName)
      assertCollection(randomAuthCodeName)
      assertCollection(randomClientsName)
    })
  })

  describe('createClient', function () {
    it('creates a client with minimum required credentials', function () {
      const model = new Model()
      const title = Random.id()
      const redirectUris = [ Meteor.absoluteUrl('/redirect-auth') ]
      const grants = [ GrantTypes.authorization_code ]
      const clientDoc = model.createClient({ title, redirectUris, grants })

      assert.isDefined(clientDoc)
      assert.equal(clientDoc.title, title)
      assert.deepEqual(clientDoc.redirectUris, redirectUris)
      assert.deepEqual(clientDoc.grants, grants)
    })

    it('throws if required credentials are missing', function () {
      assert.fail()
    })

    it('throws if required credentials are of false type', function () {
      assert.fail()
    })
  })

  describe('getClient', function () {

    it('returns a client by clientId', function () {
      assert.fail()
    })

    it('returns false if no client is found', function () {
      assert.fail()
    })

    it('returns a client by clientId and clientSecret', function () {
      assert.fail()
    })
  })

  describe('saveToken', function () {

    it('saves an access token', function () {
      assert.fail()
    })

    it('optionally saves a refresh token', function () {
      assert.fail()
    })

    it('optionally allows to assign extended values', function () {
      assert.fail()
    })

  })

  describe('getAccessToken', function () {

    it('returns a saved token', function () {
      assert.fail()
    })
  })

  describe('saveAuthorizationCode', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })

  describe('getAuthorizationCode', function () {
    it('returns a saved authorization code', function () {
      assert.fail()
    })
  })

  describe('revokeAuthorizationCode', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })

  describe('saveRefreshToken', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })

  describe('getRefreshToken', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })

  describe('grantTypeAllowed', function () {
    it('is not yet implemented', function () {
      assert.fail()
    })
  })

  /* optional:
  generateAccessToken
  generateAuthorizationCode
  generateRefreshToken
  getUser
  getUserFromClient
  grantTypeAllowed
  revokeToken
  validateScope
  */

})