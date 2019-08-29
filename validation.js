import { check } from 'meteor/check'

export const requiredAuthorizeGetParams = {
  response_type: String,
  client_id: String,
  scope: String,
  redirect_uri: String,
  state: String
}

export const requiredAuthorizeTokenParams = {
  token: String,
  client_id: String,
  redirect_uri: String,
  response_type: String
}
export const validate = (actualParams, requiredParams) => {
  if (!actualParams || !requiredParams) {
    return false
  }
  try {
    let expected, actual
    return Object.keys(requiredParams).every(requiredParamKey => {
      actual = actualParams[ requiredParamKey ]
      expected = requiredParams[ requiredParamKey ]
      check(actual, expected)
      return true
    })
  } catch (e) {
    return false
  }
}