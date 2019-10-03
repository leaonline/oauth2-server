import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { Random } from 'meteor/random'

let AccessTokens = void 0
let RefreshTokens = void 0
let Clients = void 0
let AuthCodes = void 0
let debug = void 0

const bind = fn => Meteor.bindEnvironment(fn)

/**
 * @private used by OAuthMeteorModel.prototype.getAccessToken
 */

const getAccessToken = bind(function (bearerToken) {
  return AccessTokens.findOne({ accessToken: bearerToken })
})

/**
 * @private used by  OAuthMeteorModel.prototype.createClient
 */

const createClient = bind(function ({ title, homepage, description, privacyLink, redirectUris, grants }) {
  const existingClient = Clients.findOne({ title, homepage })
  if (existingClient) {
    return Clients.update(existingClient._id, { $set: { description, privacyLink, redirectUris, grants } })
  }
  const clientId = Random.id(16)
  const secret = Random.id(32)
  const clientDocId = Clients.insert({
    title,
    homepage,
    description,
    privacyLink,
    redirectUris,
    clientId,
    secret,
    grants
  })
  return Clients.findOne(clientDocId)
})

/**
 * @private used by OAuthMeteorModel.prototype.getClient
 */

const getClient = bind(function (clientId) {
  return Clients.findOne({ clientId })
})

/**
 * @private used by OAuthMeteorModel.prototype.saveToken
 */

const saveToken = bind(function (tokenDoc, clientDoc, userDoc) {
  const tokenDocId = AccessTokens.insert({
    accessToken: tokenDoc.accessToken,
    accessTokenExpiresAt: tokenDoc.accessTokenExpiresAt,
    refreshToken: tokenDoc.refreshToken,
    refreshTokenExpiresAt: tokenDoc.refreshTokenExpiresAt,
    scope: tokenDoc.scope,
    client: {
      id: clientDoc.clientId
    },
    user: {
      id: userDoc.id
    }
  })
  return AccessTokens.findOne(tokenDocId)
})

/**
 * @private used by OAuthMeteorModel.prototype.getAuthorizationCode
 */

const getAuthorizationCode = bind(function (authorizationCode) {
  return AuthCodes.findOne({ authorizationCode })
})

/**
 * @private used by OAuthMeteorModel.prototype.saveAuthorizationCode
 */

const saveAuthorizationCode = bind(function saveAuthCode (code, client, user) {
  const { authorizationCode } = code
  const { expiresAt } = code
  const { redirectUri } = code
  return AuthCodes.upsert({ authorizationCode }, {
    authorizationCode,
    expiresAt,
    redirectUri,
    client: {
      id: client.client_id
    },
    user: {
      id: user.id
    }
  })
})

/**
 * @private used by OAuthMeteorModel.prototype.revokeAuthorizationCode
 */

const revokeAuthorizationCode = bind(function revokeAuthorizationCode ({ authorizationCode }) {
  const docCount = AuthCodes.find({ authorizationCode }).count()
  if (docCount === 0) {
    return true
  }
  return AuthCodes.remove({ authorizationCode }) === docCount
})

/**
 * @private used by OAuthMeteorModel.prototype.saveRefreshToken
 */

const saveRefreshToken = bind(function (token, clientId, expires, user) {
  return RefreshTokens.insert({
    refreshToken: token,
    clientId,
    userId: user.id,
    expires
  })
})

/**
 * @private used by OAuthMeteorModel.prototype.getRefreshToken
 */
const getRefreshToken = bind(function (refreshToken) {
  return RefreshTokens.findOne({ refreshToken })
})


export const DefaultModelConfig = {
  accessTokensCollectionName: 'oauth_access_tokens',
  refreshTokensCollectionName: 'oauth_refresh_tokens',
  clientsCollectionName: 'oauth_clients',
  authCodesCollectionName: 'oauth_auth_codes'
}

/*
    Model specification
    generateAccessToken(client, user, scope) is optional and should return a String.
    generateAuthorizationCode() is optional and should return a String.
    generateRefreshToken(client, user, scope) is optional and should return a String.
    getUser(username, password) should return an object:
        No longer requires that id be returned.
    getUserFromClient(client) should return an object:
        No longer requires that id be returned.
    grantTypeAllowed() was removed. You can instead:
        Return falsy in your getClient()
        Throw an error in your getClient()
    revokeToken(token) is required and should return true
    validateScope(user, client, scope) should return a Boolean.
 */

function OAuthMeteorModel (config = {}) {
  config.accessTokensCollectionName = config.accessTokensCollectionName || 'oauth_access_tokens'
  config.refreshTokensCollectionName = config.refreshTokensCollectionName || 'oauth_refresh_tokens'
  config.clientsCollectionName = config.clientsCollectionName || 'oauth_clients'
  config.authCodesCollectionName = config.authCodesCollectionName || 'oauth_auth_codes'

  debug = (debug = config.debug)
  AccessTokens = (config.accessTokensCollection || new Mongo.Collection(config.accessTokensCollectionName))
  RefreshTokens = (config.refreshTokensCollection || new Mongo.Collection(config.refreshTokensCollectionName))
  Clients = (config.clientsCollection || new Mongo.Collection(config.clientsCollectionName))
  AuthCodes = (config.authCodesCollection || new Mongo.Collection(config.authCodesCollectionName))
}

/**
 * Logs to console if debug is set to true
 * @param args arbitrary list of params
 */

OAuthMeteorModel.prototype.log = function (...args) {
  if (debug === true) {
    console.log(...args)
  }
}

/**
 getAccessToken(token) should return an object with:
 accessToken (String)
 accessTokenExpiresAt (Date)
 client (Object), containing at least an id property that matches the supplied client
 scope (optional String)
 user (Object)
 */
OAuthMeteorModel.prototype.getAccessToken = async function (bearerToken) {
  this.log('[OAuth2Server]', 'MODEL getAccessToken (bearerToken:', bearerToken, ')')

  return getAccessToken(bearerToken)
}

/**
 * Registers a new client app in the {Clients} collection
 * @param title
 * @param homepage
 * @param description
 * @param privacyLink
 * @param redirectUris
 * @param grants
 * @return {Promise<Object>}
 */

OAuthMeteorModel.prototype.createClient = async function ({ title, homepage, description, privacyLink, redirectUris, grants }) {
  this.log(`[OAuth2Server] MODEL createClient (${redirectUris})`)

  return createClient({ title, homepage, description, privacyLink, redirectUris, grants })
}

/**
 getClient(clientId, clientSecret) should return an object with, at minimum:
 redirectUris (Array)
 grants (Array)
 */
OAuthMeteorModel.prototype.getClient = async function (clientId) {
  this.log(`[OAuth2Server] MODEL getClient (clientId: ${clientId})`)

  return getClient(clientId)
}

/**
 saveToken(token, client, user) and should return:
 accessToken (String)
 accessTokenExpiresAt (Date)
 client (Object)
 refreshToken (optional String)
 refreshTokenExpiresAt (optional Date)
 user (Object)
 */
OAuthMeteorModel.prototype.saveToken = async function (tokenDoc, clientDoc, userDoc) {
  this.log(`[OAuth2Server] MODEL saveAccessToken:`)
  this.log(`with token `, tokenDoc)
  this.log(`with client `, clientDoc)
  this.log(`with user `, userDoc)

  return saveToken(tokenDoc, clientDoc, userDoc)
}

/**
 getAuthCode() was renamed to getAuthorizationCode(code) and should return:
 client (Object), containing at least an id property that matches the supplied client
 expiresAt (Date)
 redirectUri (optional String)
 @returns An Object representing the authorization code and associated data.
 */
OAuthMeteorModel.prototype.getAuthorizationCode = async function (authorizationCode) {
  this.log('[OAuth2Server]', 'MODEL getAuthCode (authCode: ' + authorizationCode + ')')

  return getAuthorizationCode(authorizationCode)
}

/**
 saveAuthorizationCode(code, client, user) and should return:
 An Object representing the authorization code and associated data.
 */
OAuthMeteorModel.prototype.saveAuthorizationCode = async function (code, client, user) {
  this.log(`[OAuth2Server] MODEL saveAuthCode (code:`, code, `clientId: `, client, `user: `, user, `)`)

  await saveAuthorizationCode(code, client, user)
  return Object.assign({}, code, { client: { id: client._id }, user })
}

/**
 * revokeAuthorizationCode(code) is required and should return true
 */
OAuthMeteorModel.prototype.revokeAuthorizationCode = async function (code) {
  this.log(`[OAuth2Server] MODEL revokeAuthorizationCode (code: ${code})`)

  return revokeAuthorizationCode(code)
}

/**
 *
 * @param token
 * @param clientId
 * @param expires
 * @param user
 * @return {Promise<*>}
 */
OAuthMeteorModel.prototype.saveRefreshToken = async function (token, clientId, expires, user) {
  this.log('[OAuth2Server]', 'MODEL saveRefreshToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')')

  return saveRefreshToken(token, clientId, expires, user)
}

/**
 getRefreshToken(token) should return an object with:
 refreshToken (String)
 client (Object), containing at least an id property that matches the supplied client
 refreshTokenExpiresAt (optional Date)
 scope (optional String)
 user (Object)
 */
OAuthMeteorModel.prototype.getRefreshToken = async function (refreshToken) {
  this.log('[OAuth2Server]', 'MODEL getRefreshToken (refreshToken: ' + refreshToken + ')')

  return getRefreshToken(refreshToken)
}

/**
 *
 * @param clientId
 * @param grantType
 * @return {boolean}
 */
OAuthMeteorModel.prototype.grantTypeAllowed = async function (clientId, grantType) {
  this.log('[OAuth2Server]', 'MODEL grantTypeAllowed (clientId:', clientId, ', grantType:', grantType + ')')

  return [ 'authorization_code', 'refresh_token' ].includes(grantType)
}

export const Model = OAuthMeteorModel
