import { Match } from "meteor/check"

export const requiredAuthorizeGetParams = {
  response_type: String,
  client_id: String,
  scope: Match.Maybe(String),
  redirect_uri: String,
  state: Match.Maybe(String)
}
