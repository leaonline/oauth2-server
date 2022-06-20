import { Match } from "meteor/check"
import { nonEmptyString } from './nonEmptyString'

const isNonEmptyString = Match.Where(nonEmptyString)

export const requiredAuthorizeGetParams = {
  response_type: isNonEmptyString,
  client_id: isNonEmptyString,
  scope: Match.Maybe(String),
  redirect_uri: isNonEmptyString,
  state: Match.Maybe(String)
}
