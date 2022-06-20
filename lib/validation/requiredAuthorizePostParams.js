import { Match } from "meteor/check"
import { nonEmptyString } from './nonEmptyString'

const isNonEmptyString = Match.Where(nonEmptyString)

export const requiredAuthorizePostParams = {
  token: isNonEmptyString,
  client_id: isNonEmptyString,
  redirect_uri: isNonEmptyString,
  response_type: isNonEmptyString,
  state: Match.Maybe(String),
  scope: Match.Maybe(String),
  allowed: Match.Maybe(String)
}
