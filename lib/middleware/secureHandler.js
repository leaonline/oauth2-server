import { bind } from '../utils/bind'
import { errorHandler } from '../utils/error'

/**
 * Creates a failsafe route handler to prevent server-halting errors
 * @private
 * @param self
 * @param handler
 * @return {Function}
 */
export const secureHandler = (self, handler) =>
  bind(async function (req, res, next) {
    try {
      return handler.call(this, req, res, next)
    } catch (anyError) {
      // to avoid server-crashes we wrap all request handlers and
      // catch the error here, creating a default 500 response
      const state = req?.query?.state
      errorHandler(res, {
        error: 'server_error',
        status: 500,
        description: 'An internal server error occurred',
        state,
        debug: self.debug,
        originalError: anyError
      })
    }
  })
