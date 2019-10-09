/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
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
      const redirectUris = [Meteor.absoluteUrl(`/${Random.id()}`)]
      const grants = [GrantTypes.authorization_code]
      const clientDocId = Promise.await(model.createClient({ title, redirectUris, grants }))
      const clientDoc = Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).findOne(clientDocId)

      assert.isDefined(clientDoc)
      assert.isDefined(clientDoc.clientId)
      assert.isDefined(clientDoc.secret)
      assert.equal(clientDoc.title, title)
      assert.deepEqual(clientDoc.redirectUris, redirectUris)
      assert.deepEqual(clientDoc.grants, grants)
    })
  })

  describe('getClient', function () {
    let model
    let clientDoc

    beforeEach(function () {
      model = new Model()
      const title = Random.id()
      const redirectUris = [Meteor.absoluteUrl(`/${Random.id()}`)]
      const grants = [GrantTypes.authorization_code]
      const clientDocId = Promise.await(model.createClient({ title, redirectUris, grants }))
      clientDoc = Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).findOne(clientDocId)
    })

    it('returns a client by clientId', function () {
      const { clientId } = clientDoc
      const actualClientDoc = Promise.await(model.getClient(clientId))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it ('returns a client on null secret', function () {
      const { clientId } = clientDoc
      const actualClientDoc = Promise.await(model.getClient(clientId, null))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it('returns false if no client is found', function () {
      const falsey = Promise.await(model.getClient(Random.id()))
      assert.isFalse(falsey)
    })

    it('returns a client by clientId and clientSecret', function () {
      const { clientId } = clientDoc
      const { secret } = clientDoc
      const actualClientDoc = Promise.await(model.getClient(clientId, secret))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it('returns false if clientSecret is incorrect', function () {
      const { clientId } = clientDoc
      const falsey = Promise.await(model.getClient(clientId, Random.id()))
      assert.isFalse(falsey)
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
