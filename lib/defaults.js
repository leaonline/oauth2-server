/**
 * Default options, that are used to merge with the user
 * defined options.
 * @type {{serverOptions: {addAcceptedScopesHeader: boolean, addAuthorizedScopesHeader: boolean, allowBearerTokensInQueryString: boolean, allowEmptyState: boolean, authorizationCodeLifetime: number, accessTokenLifetime: number, refreshTokenLifetime: number, allowExtendedTokenAttributes: boolean, requireClientAuthentication: boolean}, responseTypes: {}, model: {accessTokensCollectionName: string, refreshTokensCollectionName: string, clientsCollectionName: string, authCodesCollectionName: string, debug: boolean}, routes: {accessTokenUrl: string, authorizeUrl: string, errorUrl: string, fallbackUrl: string}}}
 */
export const OAuth2ServerDefaults = {
  serverOptions: {
    addAcceptedScopesHeader: true,
    addAuthorizedScopesHeader: true,
    allowBearerTokensInQueryString: false,
    allowEmptyState: false,
    authorizationCodeLifetime: 300,
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowExtendedTokenAttributes: false,
    requireClientAuthentication: true
  },
  responseTypes: {

  },
  model: {
    accessTokensCollectionName: 'oauth_access_tokens',
    refreshTokensCollectionName: 'oauth_refresh_tokens',
    clientsCollectionName: 'oauth_clients',
    authCodesCollectionName: 'oauth_auth_codes',
    debug: false
  },
  routes: {
    accessTokenUrl: '/oauth/token',
    authorizeUrl: '/oauth/authorize',
    errorUrl: '/oauth/error',
    fallbackUrl: '/oauth/*'
  }
}
