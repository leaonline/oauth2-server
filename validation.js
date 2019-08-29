import { check } from 'meteor/check'

export const requiredAuthorizeGetParams = {
  response_type: String,
  client_id: String,
  scope: String,
  redirect_uri: String,
  state: String
}

export const requiredAuthorizePostParams = {
  allow: String,
  token: String,
  client_id: String,
  redirect_uri: String,
  response_type: String,
  state: String
}

export const validate = (actualParams, requiredParams) => {
  if (!actualParams || !requiredParams) {
    return false
  }
  const checkParam = requiredParamKey => {
    actual = actualParams[ requiredParamKey ]
    expected = requiredParams[ requiredParamKey ]
    check(actual, expected) // use console.log(requiredParamKey, actual, expected)
  }
  let expected, actual
  Object.keys(requiredParams).every(checkParam)
  return true
}
