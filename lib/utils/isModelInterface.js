const modelNames = [
  'getAuthorizationCode',
  'getClient',
  'getRefreshToken',
  'revokeAuthorizationCode',
  'saveAuthorizationCode',
  'saveRefreshToken',
  'saveToken',
  'getAccessToken'
]

/**
 * Since we allow projects to implement their own model (while providing ours
 * as drop-in) we still need to validate, whether they implement the model
 * correctly.
 *
 * We duck-type check if the model implements the most important functions.
 *
 * @param model {Object} the model implementation
 * @return {boolean} true if valid, otherwise false
 */
export const isModelInterface = model => {
  return model && Object.keys(model).some(property => {
    return modelNames.includes(property) && typeof model[property] === 'function'
  })
}
