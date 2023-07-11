
import { Match } from 'meteor/check'
import { nonEmptyString } from './nonEmptyString'

const isNonEmptyString = Match.Where(nonEmptyString)

export const requiredRefreshTokenPostParams = {
  refresh_token: isNonEmptyString,
  client_id: isNonEmptyString,
  client_secret: isNonEmptyString,
  grant_type: 'refresh_token',
}
