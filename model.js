import { Meteor } from 'meteor/meteor'

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

    this.prototype.saveAccessToken = bind(function (token, clientId, expires, user, callback) {
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

    this.prototype.saveAuthCode = bind(function (code, clientId, expires, user, callback) {
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
  }

  constructor (config) {
    if (config == null) { config = {} }
    if (config.accessTokensCollectionName == null) { config.accessTokensCollectionName = 'oauth_access_tokens' }
    if (config.refreshTokensCollectionName == null) { config.refreshTokensCollectionName = 'oauth_refresh_tokens' }
    if (config.clientsCollectionName == null) { config.clientsCollectionName = 'oauth_clients' }
    if (config.authCodesCollectionName == null) { config.authCodesCollectionName = 'oauth_auth_codes' }

    this.debug = (debug = config.debug)

    this.AccessTokens = (AccessTokens = config.accessTokensCollection || new Meteor.Collection(config.accessTokensCollectionName))
    this.RefreshTokens = (RefreshTokens = config.refreshTokensCollection || new Meteor.Collection(config.refreshTokensCollectionName))
    this.Clients = (Clients = config.clientsCollection || new Meteor.Collection(config.clientsCollectionName))
    this.AuthCodes = (AuthCodes = config.authCodesCollection || new Meteor.Collection(config.authCodesCollectionName))
  }

  grantTypeAllowed (clientId, grantType, callback) {
    if (debug === true) {
      console.log('[OAuth2Server]', 'in grantTypeAllowed (clientId:', clientId, ', grantType:', grantType + ')')
    }

    return callback(false, [ 'authorization_code', 'refresh_token' ].includes(grantType))
  }
}

export const Model = OAuthMeteorModel.initClass()
