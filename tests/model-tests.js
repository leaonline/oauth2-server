/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Random } from 'meteor/random'
import { assert, expect } from 'chai'
import { OAuthMeteorModel } from '../lib/model/model'
import { DefaultModelConfig } from '../lib/model/DefaultModelConfig'

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
  assert.instanceOf(collection, Mongo.Collection)
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

  afterEach(async () => {
    await Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).removeAsync({})
    await Mongo.Collection.get(DefaultModelConfig.accessTokensCollectionName).removeAsync({})
    await Mongo.Collection.get(DefaultModelConfig.refreshTokensCollectionName).removeAsync({})
    await Mongo.Collection.get(DefaultModelConfig.authCodesCollectionName).removeAsync({})
  })

  describe('constructor', function () {
    it('can be created with defaults', function () {
      assert.isDefined(new OAuthMeteorModel())
      assertCollection(DefaultModelConfig.accessTokensCollectionName)
      assertCollection(DefaultModelConfig.refreshTokensCollectionName)
      assertCollection(DefaultModelConfig.authCodesCollectionName)
      assertCollection(DefaultModelConfig.clientsCollectionName)
    })

    it('can be created with custom collection names', function () {
      assert.isDefined(new OAuthMeteorModel({
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
      assert.isDefined(new OAuthMeteorModel({
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
    it('creates a client with minimum required credentials', async () => {
      const model = new OAuthMeteorModel()
      const title = Random.id()
      const redirectUris = [Meteor.absoluteUrl(`/${Random.id()}`)]
      const grants = [GrantTypes.authorization_code]
      const clientDocId = await (model.createClient({ title, redirectUris, grants }))
      const clientDoc = await Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).findOneAsync(clientDocId)

      assert.isDefined(clientDoc)
      assert.isDefined(clientDoc.clientId)
      assert.isDefined(clientDoc.secret)
      assert.equal(clientDoc.title, title)
      assert.deepEqual(clientDoc.redirectUris, redirectUris)
      assert.deepEqual(clientDoc.grants, grants)
    })

    it('creates a client with an already given clientId and secret', async () => {
      const model = new OAuthMeteorModel()
      const title = Random.id()
      const clientId = Random.id(16)
      const secret = Random.id(32)
      const redirectUris = [Meteor.absoluteUrl(`/${Random.id()}`)]
      const grants = [GrantTypes.authorization_code]
      const clientDocId = await (model.createClient({ title, redirectUris, grants, clientId, secret }))
      const clientDoc = await Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).findOneAsync(clientDocId)

      assert.isDefined(clientDoc)
      assert.equal(clientDoc.clientId, clientId)
      assert.equal(clientDoc.secret, secret)
      assert.equal(clientDoc.title, title)
      assert.deepEqual(clientDoc.redirectUris, redirectUris)
      assert.deepEqual(clientDoc.grants, grants)
    })
  })

  describe('getClient', function () {
    let model
    let clientDoc

    beforeEach(async () => {
      model = new OAuthMeteorModel()
      const title = Random.id()
      const redirectUris = [Meteor.absoluteUrl(`/${Random.id()}`)]
      const grants = [GrantTypes.authorization_code]
      const clientDocId = await (model.createClient({ title, redirectUris, grants }))
      clientDoc = await Mongo.Collection.get(DefaultModelConfig.clientsCollectionName).findOneAsync(clientDocId)
    })

    it('returns a client by clientId', async () => {
      const { clientId } = clientDoc
      const actualClientDoc = await (model.getClient(clientId))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it('returns a client on null secret', async () => {
      const { clientId } = clientDoc
      const actualClientDoc = await (model.getClient(clientId, null))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it('returns false if no client is found', async () => {
      const falsey = await (model.getClient(Random.id()))
      assert.isFalse(falsey)
    })

    it('returns a client by clientId and clientSecret', async () => {
      const { clientId } = clientDoc
      const { secret } = clientDoc
      const actualClientDoc = await (model.getClient(clientId, secret))
      assert.deepEqual(actualClientDoc, clientDoc)
    })

    it('returns false if clientSecret is incorrect', async () => {
      const { clientId } = clientDoc
      const falsey = await (model.getClient(clientId, Random.id()))
      assert.isFalse(falsey)
    })
  })

  describe('saveToken', function () {
    let model

    beforeEach(function () {
      model = new OAuthMeteorModel()
    })

    it('saves an access token', async () => {
      const insertTokenDoc = {
        accessToken: Random.id(),
        accessTokenExpiresAt: new Date(),
        refreshToken: Random.id(),
        refreshTokenExpiresAt: new Date(),
        scope: ['foo', 'bar']
      }
      const clientDoc = { clientId: Random.id() }
      const userDoc = { id: Random.id() }
      const tokenDoc = await model.saveToken(insertTokenDoc, clientDoc, userDoc)
      expect(tokenDoc).to.deep.equal({
        ...tokenDoc,
        client: { id: clientDoc.clientId },
        user: userDoc
      })
    })
  })

  describe('getAccessToken', function () {
    let model

    beforeEach(function () {
      model = new OAuthMeteorModel()
    })

    it('returns a saved token', async () => {
      const collection = Mongo.Collection.get(DefaultModelConfig.accessTokensCollectionName)
      const accessToken = Random.id()
      const docId = await collection.insertAsync({ accessToken })
      const tokenDoc = await model.getAccessToken(accessToken)
      expect(tokenDoc).to.deep.equal({
        _id: docId,
        accessToken
      })
    })
  })

  describe('verifyScope', () => {
    let model

    beforeEach(function () {
      model = new OAuthMeteorModel()
    })

    it('returns true if the access token scope meets the expected scope', async () => {
      expect(await model.verifyScope({ scope: ['foo'] }, ['foo'])).to.equal(true)
      expect(await model.verifyScope({ scope: ['foo'] }, ['foo', 'bar'])).to.equal(false)
      expect(await model.verifyScope({ scope: ['foo'] }, [])).to.equal(false)
      expect(await model.verifyScope({ scope: [] }, ['foo'])).to.equal(false)
      expect(await model.verifyScope({ scope: ['foo', 'bar'] }, ['foo'])).to.equal(false)
    })
  })

  describe('saveAuthorizationCode', function () {
    it('is not yet implemented')
  })

  describe('getAuthorizationCode', function () {
    it('returns a saved authorization code')
  })

  describe('revokeAuthorizationCode', function () {
    it('is not yet implemented')
  })

  describe('saveRefreshToken', function () {
    it('is not yet implemented')
  })

  describe('getRefreshToken', function () {
    it('is not yet implemented')
  })

  describe('grantTypeAllowed', function () {
    it('is not yet implemented')
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
