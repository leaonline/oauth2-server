import { Match } from 'meteor/check'
import { nonEmptyString } from './nonEmptyString'

const isNonEmptyString = Match.Where(nonEmptyString)

export const requiredRefreshTokenPostParams = {
  grant_type: isNonEmptyString,
  refresh_token: isNonEmptyString,
  client_id: Match.Maybe(String),
  client_secret: Match.Maybe(String)
}
