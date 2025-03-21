import { debug } from '../utils/console'

/**
 * Creates a middleware to debug routes on an instance level
 * @private
 * @param instance
 * @param options {object?} optional options
 * @param options.description {string?} optional way to descrive the next handler
 * @param options.data {boolean?} optional flag to log body/query
 */
export const getDebugMiddleWare = (instance, options = {}) => {
  if (!instance.debug) {
    return function (req, res, next) { next() }
  }

  return function (req, res, next) {
    const baseUrl = req.originalUrl.split('?')[0]
    let message = `${req.method} ${baseUrl}`

    if (options.description) {
      message = `${message} (${options.description})`
    }

    if (options.data) {
      const data = { query: req.query, body: req.body }
      message = `${message} data: ${data}`
    }

    debug(message)
    next()
  }
}
