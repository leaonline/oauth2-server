import { check, Match } from 'meteor/check'

export const OAuth2ServerOptionsSchema = {
  serverOptions: {
    addAcceptedScopesHeader: Match.Maybe(Boolean),
    addAuthorizedScopesHeader: Match.Maybe(Boolean),
    allowBearerTokensInQueryString: Match.Maybe(Boolean),
    allowEmptyState: Match.Maybe(Boolean),
    authorizationCodeLifetime: Match.Maybe(Number),
    accessTokenLifetime: Match.Maybe(Number),
    refreshTokenLifetime: Match.Maybe(Number),
    allowExtendedTokenAttributes: Match.Maybe(Boolean),
    requireClientAuthentication: Match.Maybe(Boolean)

  }
}

export const requiredAccessTokenPostParams = {
  grant_type: String,
  code: String,
  redirect_uri: String,
  client_id: String,
  client_secret: String,
  state: Match.Maybe(String)
}

export const requiredAuthorizeGetParams = {
  response_type: String,
  client_id: String,
  scope: Match.Maybe(String),
  redirect_uri: String,
  state: Match.Maybe(String)
}

export const requiredAuthorizePostParams = {
  token: String,
  client_id: String,
  redirect_uri: String,
  response_type: String,
  state: Match.Maybe(String),
  scope: Match.Maybe(String),
  allowed: Match.Maybe(String)
}

export const validate = (actualParams, requiredParams, debug) => {
  if (!actualParams || !requiredParams) {
    return false
  }
  const checkParam = requiredParamKey => {
    actual = actualParams[requiredParamKey]
    expected = requiredParams[requiredParamKey]
    try {
      check(actual, expected) // use console.log(requiredParamKey, actual, expected)
      return true
    } catch (e) {
      if (debug) {
        console.error(`[validation error]: key <${requiredParamKey}> => expected <${expected}>, got <${actual}>`)
      }
      return false
    }
  }
  let expected, actual
  return Object.keys(requiredParams).every(checkParam)
}
