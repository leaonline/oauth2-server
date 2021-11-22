import { errorHandler } from '../error'
import { bind } from '../utils/bind'

export const secureHandler = (self, handler) => bind(function (req, res, next) {
  const that = this

  try {
    handler.call(that, req, res, next)
  }

  // to avoid server-crashes we wrap all request handlers and
  // catch the error here, creating a default 500 response
  catch (anyError) {
    const state = req && req.query && req.query.state
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
