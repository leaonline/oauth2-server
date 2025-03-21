import { check, Match } from 'meteor/check'
import { warn } from '../utils/console'

/**
 * Used to register handlers for different instances that validate users.
 * This allows you to validate user access on a client-based level.
 */
export const UserValidation = {}

/** @private */
const validationHandlers = new WeakMap()

/**
 * Registers a validation method that allows
 * to validate users on custom logic.
 * @param instance {OAuth2Server}
 * @param validationHandler {function} sync or async function that performs the validation
 */
UserValidation.register = function (instance, validationHandler) {
  const instanceCheck = { instanceId: instance.instanceId }
  check(instanceCheck, Match.ObjectIncluding({
    instanceId: String
  }))
  check(validationHandler, Function)

  validationHandlers.set(instance, validationHandler)
}

/**
 * Delegates `handlerArgs` to the registered validation handler.
 * @param instance {OAuth2Server}
 * @param handlerArgs {*}
 * @return {*} should return truthy/falsy value
 */
UserValidation.isValid = async function (instance, handlerArgs) {
  // we assume, that if there is no validation handler registered
  // then the developers intended to do so. However, we will print an info.
  if (!validationHandlers.has(instance)) {
    if (instance.debug) {
      warn(`skip user validation, no handler found for instance ${instance.instanceId}`)
    }

    return true
  }

  const validationHandler = validationHandlers.get(instance)

  return validationHandler(handlerArgs)
}
