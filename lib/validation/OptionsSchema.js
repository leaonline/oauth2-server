import { Match } from 'meteor/check'

export const OptionsSchema = {
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
