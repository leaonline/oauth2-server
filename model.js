import { Meteor } from 'meteor/meteor'

/*
    Model specification

    generateAccessToken(client, user, scope) is optional and should return a String.
    generateAuthorizationCode() is optional and should return a String.
    generateRefreshToken(client, user, scope) is optional and should return a String.
    getAccessToken(token) should return an object with:
        accessToken (String)
        accessTokenExpiresAt (Date)
        client (Object), containing at least an id property that matches the supplied client
        scope (optional String)
        user (Object)
    getAuthCode() was renamed to getAuthorizationCode(code) and should return:
        client (Object), containing at least an id property that matches the supplied client
        expiresAt (Date)
        redirectUri (optional String)
        user (Object)
    getClient(clientId, clientSecret) should return an object with, at minimum:
        redirectUris (Array)
        grants (Array)
    getRefreshToken(token) should return an object with:
        refreshToken (String)
        client (Object), containing at least an id property that matches the supplied client
        refreshTokenExpiresAt (optional Date)
        scope (optional String)
        user (Object)
    getUser(username, password) should return an object:
        No longer requires that id be returned.
    getUserFromClient(client) should return an object:
        No longer requires that id be returned.
    grantTypeAllowed() was removed. You can instead:
        Return falsy in your getClient()
        Throw an error in your getClient()
    revokeAuthorizationCode(code) is required and should return true
    revokeToken(token) is required and should return true
    saveAccessToken() was renamed to saveToken(token, client, user) and should return:
        accessToken (String)
        accessTokenExpiresAt (Date)
        client (Object)
        refreshToken (optional String)
        refreshTokenExpiresAt (optional Date)
        user (Object)
    saveAuthCode() was renamed to saveAuthorizationCode(code, client, user) and should return:
        authorizationCode (String)
    validateScope(user, client, scope) should return a Boolean.

 */

let AccessTokens = void 0
let RefreshTokens = void 0
let Clients = void 0
let AuthCodes = void 0
let debug = void 0

const bind = fn => Meteor.bindEnvironment(fn)

class OAuthMeteorModel {
  static initClass () {
    this.prototype.getAccessToken = bind(function (bearerToken, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in getAccessToken (bearerToken:', bearerToken, ')')
      }

      try {
        const token = AccessTokens.findOne({ accessToken: bearerToken })
        return callback(null, token)
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.getClient = bind(function (clientId, clientSecret, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in getClient (clientId:', clientId, ', clientSecret:', clientSecret, ')')
      }

      try {
        let client
        if ((clientSecret == null)) {
          client = Clients.findOne({ active: true, clientId })
        } else {
          client = Clients.findOne({ active: true, clientId, clientSecret })
        }
        return callback(null, client)
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.saveToken = bind(function (token, clientId, expires, user, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in saveAccessToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')')
      }

      try {
        const tokenId = AccessTokens.insert({
          accessToken: token,
          clientId,
          userId: user.id,
          expires
        })

        return callback(null, tokenId)
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.getAuthCode = bind(function (authCode, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in getAuthCode (authCode: ' + authCode + ')')
      }

      try {
        const code = AuthCodes.findOne({ authCode })
        return callback(null, code)
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.saveAuthorizationCode = bind(function (code, clientId, expires, user, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in saveAuthCode (code:', code, ', clientId:', clientId, ', expires:', expires, ', user:', user, ')')
      }

      try {
        const codeId = AuthCodes.upsert(
          { authCode: code }
          , {
            authCode: code,
            clientId,
            userId: user.id,
            expires
          }
        )

        return callback(null, codeId)
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.saveRefreshToken = bind(function (token, clientId, expires, user, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in saveRefreshToken (token:', token, ', clientId:', clientId, ', user:', user, ', expires:', expires, ')')
      }

      try {
        let tokenId
        return tokenId = RefreshTokens.insert({
            refreshToken: token,
            clientId,
            userId: user.id,
            expires
          },

          callback(null, tokenId))
      } catch (e) {
        return callback(e)
      }
    })

    this.prototype.getRefreshToken = bind(function (refreshToken, callback) {
      if (debug === true) {
        console.log('[OAuth2Server]', 'in getRefreshToken (refreshToken: ' + refreshToken + ')')
      }

      try {
        const token = RefreshTokens.findOne({ refreshToken })
        return callback(null, token)
      } catch (e) {
        return callback(e)
      }
    })

    return this
  }

  constructor (config = {}) {
    config.accessTokensCollectionName = config.accessTokensCollectionName || 'oauth_access_tokens'
    config.refreshTokensCollectionName = config.refreshTokensCollectionName || 'oauth_refresh_tokens'
    config.clientsCollectionName = config.clientsCollectionName || 'oauth_clients'
    config.authCodesCollectionName = config.authCodesCollectionName || 'oauth_auth_codes'

    debug = (debug = config.debug)
    AccessTokens = (AccessTokens = config.accessTokensCollection || new Meteor.Collection(config.accessTokensCollectionName))
    RefreshTokens = (RefreshTokens = config.refreshTokensCollection || new Meteor.Collection(config.refreshTokensCollectionName))
    Clients = (Clients = config.clientsCollection || new Meteor.Collection(config.clientsCollectionName))
    AuthCodes = (AuthCodes = config.authCodesCollection || new Meteor.Collection(config.authCodesCollectionName))
  }

  grantTypeAllowed (clientId, grantType, callback) {
    if (debug === true) {
      console.log('[OAuth2Server]', 'in grantTypeAllowed (clientId:', clientId, ', grantType:', grantType + ')')
    }

    return callback(false, [ 'authorization_code', 'refresh_token' ].includes(grantType))
  }
}

export const Model = OAuthMeteorModel.initClass()
