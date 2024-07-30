import { check } from 'meteor/check'
import { error } from '../utils/console'

/**
 * Abstraction that checks given query/body params against a given schema
 * @param actualParams
 * @param requiredParams
 * @param debug
 * @return {this is T[]|boolean}
 */
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
    } catch (e) {
      if (debug) {
        error(`[validation error]: key <${requiredParamKey}> => expected <${expected}>, got <${actual}>`)
      }
      return false
    }
  }
  let expected, actual
  return Object.keys(requiredParams).every(checkParam)
}
