export const errorHandler = function (res, { error, description, uri, status, state, debug, originalError }) {
  const errCode = status || 500
  res.writeHead(errCode, { 'Content-Type': 'application/json' })
  if (debug) {
    console.error(`[ERROR] ${errCode} - ${error} - ${description}`)
    if (originalError) {
      console.error(originalError)
    }
  }
  const body = JSON.stringify({
    error,
    error_description: description,
    error_uri: uri,
    state
  }, null, 2)
  res.end(body)
}
