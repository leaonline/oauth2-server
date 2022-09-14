import { error } from './console'

/**
 * Unifies error handling as http response.
 * Defaults to a 500 response, unless further details were added.
 * @param res
 * @param options {Object} options with error information
 * @param options.error {String} Error name
 * @param options.description {String} Error description
 * @param options.uri {String?} Optional uri to redirect to when error occurs
 * @param options.status {Number?} Optional statuscode, defaults to 500
 * @param options.state {String} State object vor validation
 * @param options.debug {Boolean|undefined} State object vor validation
 * @param options.originalError {Error|undefined} original Error instance
 */

export const errorHandler = function (res, options) {
  // { error, description, uri, status, state, debug, originalError }
  const errCode = options.status || 500
  res.writeHead(errCode, { 'Content-Type': 'application/json' })

  // by default we log the error that will be used as response
  options.debug && error(`[error] ${errCode} - ${options.error} - ${options.description}`)

  if (options.debug && options.originalError) {
    error('[original error]:')
    error(options.originalError)
  }

  const body = JSON.stringify({
    error: options.error,
    error_description: options.description,
    error_uri: options.uri,
    state: options.state
  }, null, 2)

  res.end(body)
}
