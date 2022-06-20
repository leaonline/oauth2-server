import { debug } from '../utils/console'

/**
 * Creates a middleware to debug routes on an instance level
 * @private
 * @param instance
 * @return {function(*, *, *): *}
 */
export const getDebugMiddleWare = instance => (req, res, next) => {
  if (instance.debug === true) {
    const baseUrl = req.originalUrl.split('?')[0]
    debug(req.method, baseUrl, req.query || req.body)
  }
  return next()
}
