import { createCollection } from './utils'
import {
  collections,
  createClient,
  getAuthorizationCode,
  getClient,
  getRefreshToken,
  revokeAuthorizationCode,
  saveAuthorizationCode,
  saveRefreshToken,
  saveToken,
  getAccessToken
} from './meteor-model'

export const DefaultModelConfig = {
  accessTokensCollectionName: 'oauth_access_tokens',
  refreshTokensCollectionName: 'oauth_refresh_tokens',
  clientsCollectionName: 'oauth_clients',
  authCodesCollectionName: 'oauth_auth_codes',
  debug: false
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
  const _config = Object.assign({}, DefaultModelConfig, config)
  this.debug = _config.debug
  collections.AccessTokens = createCollection(_config.accessTokensCollection, _config.accessTokensCollectionName)
  collections.RefreshTokens = createCollection(_config.refreshTokensCollection, _config.refreshTokensCollectionName)
  collections.AuthCodes = createCollection(_config.authCodesCollection, _config.authCodesCollectionName)
  collections.Clients = createCollection(_config.clientsCollection, _config.clientsCollectionName)
}

/**
 * Logs to console if debug is set to true
 * @param args arbitrary list of params
 */

OAuthMeteorModel.prototype.log = function (...args) {
  if (this.debug === true) {
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
 * @param clientId
 * @param secret
 * @return {Promise<Object>}
 */

OAuthMeteorModel.prototype.createClient = async function ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) {
  this.log(`[OAuth2Server] MODEL createClient (${redirectUris})`)

  return createClient({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret })
}

/**
 getClient(clientId, clientSecret) should return an object with, at minimum:
 redirectUris (Array)
 grants (Array)
 */
OAuthMeteorModel.prototype.getClient = async function (clientId, secret) {
  this.log(`[OAuth2Server] MODEL getClient (clientId: ${clientId}) (secret: ${secret})`)
  return getClient(clientId, secret)
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
  this.log('[OAuth2Server] MODEL saveAccessToken:')
  this.log('with token ', tokenDoc)
  this.log('with client ', clientDoc)
  this.log('with user ', userDoc)

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
  this.log('[OAuth2Server]', 'MODEL getAuthorizationCode (authCode: ' + authorizationCode + ')')
  return getAuthorizationCode(authorizationCode)
}

/**
 * should return an Object representing the authorization code and associated data.
 * @param code
 * @param client
 * @param user
 * @returns {Promise<Object>}
 */
OAuthMeteorModel.prototype.saveAuthorizationCode = async function (code, client, user) {
  this.log('[OAuth2Server] MODEL saveAuthorizationCode (code:', code, 'client: ', client, 'user: ', user, ')')

  return await saveAuthorizationCode(code, client, user)
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
