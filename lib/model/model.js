import { DefaultModelConfig } from './DefaultModelConfig'
import { createCollection } from '../utils/createCollection'
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
  getAccessToken,
  revokeToken
} from './meteor-model'

/**
 * Implements the OAuth2Server model with Meteor-Mongo bindings.
 */
class OAuthMeteorModel {
  constructor (config = {}) {
    const modelConfig = { ...DefaultModelConfig, ...config }

    this.debug = modelConfig.debug

    collections.AccessTokens = createCollection(modelConfig.accessTokensCollection, modelConfig.accessTokensCollectionName)
    collections.RefreshTokens = createCollection(modelConfig.refreshTokensCollection, modelConfig.refreshTokensCollectionName)
    collections.AuthCodes = createCollection(modelConfig.authCodesCollection, modelConfig.authCodesCollectionName)
    collections.Clients = createCollection(modelConfig.clientsCollection, modelConfig.clientsCollectionName)
  }

  /**
   * Logs to console if debug is set to true
   * @param args arbitrary list of params
   */

  log (...args) {
    if (this.debug === true) {
      console.log('[OAuth2Server][model]:', ...args)
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
  async getAccessToken (bearerToken) {
    this.log('getAccessToken (bearerToken:', bearerToken, ')')
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

  async createClient ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) {
    this.log(`createClient (${redirectUris})`)
    return createClient({
      title,
      homepage,
      description,
      privacyLink,
      redirectUris,
      grants,
      clientId,
      secret
    })
  }

  /**
   getClient(clientId, clientSecret) should return an object with, at minimum:
   redirectUris (Array)
   grants (Array)
   */
  async getClient (clientId, secret) {
    this.log(`getClient (clientId: ${clientId}) (secret: ${secret})`)
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
  async saveToken (tokenDoc, clientDoc, userDoc) {
    this.log('saveAccessToken:')
    this.log('with token ', tokenDoc)
    this.log('with client ', clientDoc)
    this.log('with user ', userDoc)
    const accessTokenToc = await saveToken(tokenDoc, clientDoc, userDoc)
    if (!clientDoc.grants.includes('refresh_token')) return accessTokenToc

    this.log('saveRefreshToken:')
    const refreshTokenDoc = await saveRefreshToken(tokenDoc, clientDoc, userDoc)
    return Object.assign({}, accessTokenToc, refreshTokenDoc)
  }

  /**
   getAuthCode() was renamed to getAuthorizationCode(code) and should return:
   client (Object), containing at least an id property that matches the supplied client
   expiresAt (Date)
   redirectUri (optional String)
   @returns An Object representing the authorization code and associated data.
   */
  async getAuthorizationCode (authorizationCode) {
    this.log('MODEL getAuthorizationCode (authCode: ' + authorizationCode + ')')
    return getAuthorizationCode(authorizationCode)
  }

  /**
   * should return an Object representing the authorization code and associated data.
   * @param code
   * @param client
   * @param user
   * @returns {Promise<Object>}
   */
  async saveAuthorizationCode (code, client, user) {
    this.log('saveAuthorizationCode (code:', code, 'client: ', client, 'user: ', user, ')')
    return saveAuthorizationCode(code, client, user)
  }

  /**
   * revokeAuthorizationCode(code) is required and should return true
   */
  async revokeAuthorizationCode (code) {
    this.log(`revokeAuthorizationCode (code: ${code})`)
    return revokeAuthorizationCode(code)
  }

  /**
   getRefreshToken(token) should return an object with:
   refreshToken (String)
   client (Object), containing at least an id property that matches the supplied client
   refreshTokenExpiresAt (optional Date)
   scope (optional String)
   user (Object)
   */
  async getRefreshToken (refreshToken) {
    this.log('getRefreshToken (refreshToken: ' + refreshToken + ')')
    return getRefreshToken(refreshToken)
  }

  async revokeToken (token) {
    /* Delete the token from the database */
    this.log('revokeToken (token:', token + ')')

    if (!token || token === 'undefined') {
      return false;
    }

    return revokeToken(token)
  }

  /**
   *
   * @param clientId
   * @param grantType
   * @return {boolean}
   */
  async grantTypeAllowed (clientId, grantType) {
    this.log('grantTypeAllowed (clientId:', clientId, ', grantType:', grantType + ')')
    return ['authorization_code', 'refresh_token'].includes(grantType)
  }
}

export { OAuthMeteorModel }
