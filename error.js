export const errorHandler = function (res, { error, description, uri, status, state, debug, originalError }) {
  const errCode = status || 500
  res.writeHead(errCode, { 'Content-Type': 'application/json' })

  // by default we log the error that will be used as response
  console.error(`[OAuth2Server]: ${errCode} - ${error} - ${description}`)

  if (debug && originalError) {
    console.error('[OAuth2Server]: original error:')
    console.error(originalError)
  }

  const body = JSON.stringify({
    error,
    error_description: description,
    error_uri: uri,
    state
  }, null, 2)

  res.end(body)
}
