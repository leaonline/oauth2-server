import { Random } from 'meteor/random'
import { bind } from '../utils/bind'

export const collections = {
  AccessTokens: undefined,
  Clients: undefined,
  AuthCodes: undefined
}

/**
 * @private used by OAuthMeteorModel.prototype.getAccessToken
 */

export const getAccessToken = bind(function (bearerToken) {
  return collections.AccessTokens.findOne({ accessToken: bearerToken })
})

/**
 * @private used by  OAuthMeteorModel.prototype.createClient
 */

export const createClient = bind(function ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) {
  const existingClient = collections.Clients.findOne({ title })

  if (existingClient) {
    const updateValues = { description, privacyLink, redirectUris, grants }
    if (clientId) updateValues.clientId = clientId
    if (secret) updateValues.secret = secret
    return collections.Clients.update(existingClient._id, {
      $set: updateValues
    })
  }

  const clientDocId = collections.Clients.insert({
    title,
    homepage,
    description,
    privacyLink,
    redirectUris,
    clientId: clientId || Random.id(16),
    secret: secret || Random.id(32),
    grants
  })
  return collections.Clients.findOne(clientDocId)
})

/**
 * @private used by OAuthMeteorModel.prototype.getClient
 */

export const getClient = bind(function (clientId, secret) {
  const clientDoc = collections.Clients.findOne({
    clientId,
    secret: secret || undefined // secret can be undefined or null but should act as the same
  })
  return clientDoc || false
})

/**
 * @private used by OAuthMeteorModel.prototype.saveToken
 */

export const saveToken = bind(function (tokenDoc, clientDoc, userDoc) {
  const tokenDocId = collections.AccessTokens.insert({
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
  return collections.AccessTokens.findOne(tokenDocId)
})

/**
 * @private used by OAuthMeteorModel.prototype.getAuthorizationCode
 */

export const getAuthorizationCode = bind(function (authorizationCode) {
  return collections.AuthCodes.findOne({ authorizationCode })
})

/**
 * @private used by OAuthMeteorModel.prototype.saveAuthorizationCode
 */

export const saveAuthorizationCode = bind(function saveAuthCode (code, client, user) {
  const { authorizationCode } = code
  const { expiresAt } = code
  const { redirectUri } = code

  collections.AuthCodes.upsert({ authorizationCode }, {
    authorizationCode,
    expiresAt,
    redirectUri,
    scope: code.scope,
    client: {
      id: client.client_id
    },
    user: {
      id: user.id
    }
  })
  return collections.AuthCodes.findOne({ authorizationCode })
})

/**
 * @private used by OAuthMeteorModel.prototype.revokeAuthorizationCode
 */

export const revokeAuthorizationCode = bind(function revokeAuthorizationCode ({ authorizationCode }) {
  const docCount = collections.AuthCodes.find({ authorizationCode }).count()
  if (docCount === 0) {
    return true
  }
  return collections.AuthCodes.remove({ authorizationCode }) === docCount
})

/**
 * @private used by OAuthMeteorModel.prototype.getRefreshToken
 */
export const getRefreshToken = bind(function (refreshToken) {
  return collections.AccessTokens.findOne({ refreshToken })
})

/**
 * @private used by OauthMeteorModel.protoptype.revokeToken
 */
export const revokeToken = bind(function (token) {
  return collections.AccessTokens.update({ refreshToken: token.refreshToken }, { $unset: { refreshToken: null, refreshTokenExpiresAt: null } })
})
