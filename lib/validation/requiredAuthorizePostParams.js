import { Match } from "meteor/check"

export const requiredAuthorizePostParams = {
  token: String,
  client_id: String,
  redirect_uri: String,
  response_type: String,
  state: Match.Maybe(String),
  scope: Match.Maybe(String),
  allowed: Match.Maybe(String)
}
