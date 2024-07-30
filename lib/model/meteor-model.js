import { Random } from 'meteor/random'

export const collections = {
  /** @type {Mongo.Collection} */
  AccessTokens: undefined,
  /** @type {Mongo.Collection} */
  RefreshTokens: undefined,
  /** @type {Mongo.Collection} */
  Clients: undefined,
  /** @type {Mongo.Collection} */
  AuthCodes: undefined
}

/**
 * used by OAuthMeteorModel.prototype.getAccessToken
 * @private
 */

export const getAccessToken = async (accessToken) => {
  return collections.AccessTokens.findOneAsync({ accessToken })
}

/**
 * used by  OAuthMeteorModel.prototype.createClient
 * @private
 */

export const createClient = async ({ title, homepage, description, privacyLink, redirectUris, grants, clientId, secret }) => {
  const existingClient = await collections.Clients.findOneAsync({ title })

  if (existingClient) {
    const updateValues = { description, privacyLink, redirectUris, grants }
    if (clientId) updateValues.clientId = clientId
    if (secret) updateValues.secret = secret
    return collections.Clients.updateAsync(existingClient._id, {
      $set: updateValues
    })
  }

  const clientDocId = await collections.Clients.insertAsync({
    title,
    homepage,
    description,
    privacyLink,
    redirectUris,
    clientId: clientId || Random.id(16),
    secret: secret || Random.id(32),
    grants
  })
  return collections.Clients.findOneAsync(clientDocId)
}

/**
 * used by OAuthMeteorModel.prototype.getClient
 * @private
 */

export const getClient = async (clientId, secret) => {
  const clientDoc = await collections.Clients.findOneAsync({
    clientId,
    secret: secret || undefined // secret can be undefined or null but should act as the same
  })
  return clientDoc || false
}

/**
 * used by OAuthMeteorModel.prototype.saveToken
 * @private
 */

export const saveToken = async (tokenDoc, clientDoc, userDoc) => {
  const tokenDocId = await collections.AccessTokens.insertAsync({
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
  return collections.AccessTokens.findOneAsync(tokenDocId)
}

/**
 * used by OAuthMeteorModel.prototype.getAuthorizationCode
 * @private
 */

export const getAuthorizationCode = async (authorizationCode) => {
  return collections.AuthCodes.findOneAsync({ authorizationCode })
}

/**
 * used by OAuthMeteorModel.prototype.saveAuthorizationCode
 * @private
 */

export const saveAuthorizationCode = async (code, client, user) => {
  const { authorizationCode } = code
  const { expiresAt } = code
  const { redirectUri } = code

  await collections.AuthCodes.upsertAsync({ authorizationCode }, {
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
  return collections.AuthCodes.findOneAsync({ authorizationCode })
}

/**
 * used by OAuthMeteorModel.prototype.revokeAuthorizationCode
 * @private
 */

export const revokeAuthorizationCode = async ({ authorizationCode }) => {
  const docCount = await collections.AuthCodes.countDocuments({ authorizationCode })
  if (docCount === 0) {
    return true
  }
  const removeCount = await collections.AuthCodes.removeAsync({ authorizationCode })
  return removeCount === docCount
}

/**
 * used by OAuthMeteorModel.prototype.saveRefreshToken
 * @private
 */

export const saveRefreshToken = async (token, clientId, expires, user) => {
  return collections.RefreshTokens.insertAsync({
    refreshToken: token,
    clientId,
    userId: user.id,
    expires
  })
}

/**
 * used by OAuthMeteorModel.prototype.getRefreshToken
 * @private
 */
export const getRefreshToken = async (refreshToken) => {
  return collections.RefreshTokens.findOneAsync({ refreshToken })
}
