import { Match } from "meteor/check"
import { nonEmptyString } from './nonEmptyString'

const isNonEmptyString = Match.Where(nonEmptyString)

export const requiredAccessTokenPostParams = {
  grant_type: isNonEmptyString,
  code: isNonEmptyString,
  redirect_uri: isNonEmptyString,
  client_id: isNonEmptyString,
  client_secret: isNonEmptyString,
  state: Match.Maybe(String)
}
