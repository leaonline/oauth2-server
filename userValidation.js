import { check } from 'meteor/check'

/**
 * Used to register handlers for different instances that validate users
 * @type {{}}
 */
export const UserValidation = {}

const allValidationHandlers = new Map()

UserValidation.register = function (instanceId, validationHandler) {
  check(instanceId, String)
  check(validationHandler, Function)
  allValidationHandlers.set(instanceId, validationHandler)
}

UserValidation.isRegistered = function (instanceId) {
  check(instanceId, String)
  return allValidationHandlers.has(instanceId)
}

UserValidation.isValid = function (instanceId, user) {
  check(instanceId, String)

  const validationHandler = allValidationHandlers.get(instanceId)
  if (!validationHandler) {
    throw new Error(`Expected validation handler for instancId [${instanceId}], got undefined`)
  }

  return validationHandler.call(null, user)
}
