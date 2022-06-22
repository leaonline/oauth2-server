import { check } from 'meteor/check'

export const validateParams = (actualParams, requiredParams, debug) => {
  if (!actualParams || !requiredParams) {
    return false
  }
  const checkParam = requiredParamKey => {
    actual = actualParams[requiredParamKey]
    expected = requiredParams[requiredParamKey]
    try {
      check(actual, expected) // use console.log(requiredParamKey, actual, expected)
      return true
    }
    catch (e) {
      if (debug) {
        console.error(`[validation error]: key <${requiredParamKey}> => expected <${expected}>, got <${actual}>`)
      }
      return false
    }
  }
  let expected, actual
  return Object.keys(requiredParams).every(checkParam)
}
