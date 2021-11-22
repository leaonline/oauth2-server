import { Match } from "meteor/check"

export const requiredAccessTokenPostParams = {
  grant_type: String,
  code: String,
  redirect_uri: String,
  client_id: String,
  client_secret: String,
  state: Match.Maybe(String)
}
