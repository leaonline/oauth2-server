/**
 * Contains all valid model names
 * @private
 */
const modelNames = [
  'getAuthorizationCode',
  'getClient',
  'getRefreshToken',
  'revokeAuthorizationCode',
  'saveAuthorizationCode',
  'saveToken',
  'getAccessToken'
]

/**
 * Since we allow projects to implement their own model (while providing ours
 * as drop-in) we still need to validate, whether they implement the model
 * correctly.
 *
 * We duck-type check if the model implements the most important functions.
 * Uses the following values to check:
 * - 'getAuthorizationCode',
 * - 'getClient',
 * - 'getRefreshToken',
 * - 'revokeAuthorizationCode',
 * - 'saveAuthorizationCode',
 * - 'saveRefreshToken',
 * - 'saveToken',
 * - 'getAccessToken'
 * @param model {Object} the model implementation
 * @return {boolean} true if valid, otherwise false
 */
export const isModelInterface = model => {
  if (!model) return false;
  const checkProperties = object => Object.getOwnPropertyNames(object).some(property => modelNames.includes(property) && typeof object[property] === 'function');
  if (model.constructor && model.constructor.name) return checkProperties(model.__proto__) 
  return checkProperties(model)
}
