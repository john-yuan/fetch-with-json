export interface FetchOptions extends RequestInit {
  /**
   * The request url.
   */
  url?: string

  /**
   * The data to send to the server. The data will be stringified using
   * `JSON.stringify` before being sent to the server and the `Content-Type`
   * request header will be set to `application/json` if not set.
   *
   * If the `body` field is set (not `null` or `undefined`), the `json`
   * field will be ignored and we will not set the `Content-Type` header.
   */
  json?: any

  /**
   * The base URL to prepend to `url` if `url` is a relative url.
   */
  baseURL?: string

  /**
   * The value to be encoded to query string to append to the url.
   */
  query?: Record<string, any>

  /**
   * A function to encode the `query` value.
   * A query string must be returned without a leading question mark.
   * If this function is not set, the default one will be used.
   */
  encodeQuery?: (query: Record<string, any>) => string
}

export interface FetchResponse<T = any> {
  /**
   * The `Headers` object associated with the response.
   */
  headers: Headers

  /**
   * The response data. Parsed from the response body text with `JSON.parse`.
   * If parsing fails, this field will be set to the response body text and
   * the `error` field of the response will be set to the error thrown
   * during the parsing.
   */
  json: T

  /**
   * The error thrown while parsing the response body text with `JSON.parse`.
   * If no error has been thrown, the value of this field is `undefined`.
   */
  error?: Error

  /**
   * A boolean indicating whether the response was successful (status in the
   * range 200 – 299) or not.
   */
  ok: boolean

  /**
   * Indicates whether or not the response is the result of a redirect
   * (that is, its URL list has more than one entry).
   */
  redirected: boolean

  /**
   * The status code of the response.
   */
  status: number

  /**
   * The status message corresponding to the status code. (e.g., OK for 200).
   */
  statusText: string

  /**
   * The original response body text.
   */
  text: string

  /**
   * The type of the response (e.g., basic, cors).
   */
  type: ResponseType

  /**
   * The URL of the response.
   */
  url: string
}

export interface FetchMethod {
  <T = any>(options: FetchOptions): Promise<FetchResponse<T>>
  <T = any>(options: FetchOptions, rawResponse: true): Promise<Response>
}

const hasOwn = Object.prototype.hasOwnProperty

function omit<T = any>(object: any, omitted: string[]) {
  const result: any = {}

  for (const key in object) {
    if (omitted.indexOf(key) < 0 && hasOwn.call(object, key)) {
      result[key] = object[key]
    }
  }

  return result as T
}

function isRelativeURL(url: string) {
  return !/^(?:[a-z][a-z0-9\-.+]*:)?\/\//i.test(url)
}

function addQueryString(url: string, search: string) {
  if (search) {
    if (url.indexOf('?') > -1) {
      const end = url[url.length - 1]

      if (end === '?' || end === '&') {
        url = url + search
      } else {
        url = url + '&' + search
      }
    } else {
      url = url + '?' + search
    }
  }

  return url
}

function defaultEncodeQuery(query: Record<string, any>) {
  const params = new URLSearchParams()

  for (const key in query) {
    if (hasOwn.call(query, key)) {
      const val = query[key]
      if (val != null) {
        if (Array.isArray(val)) {
          val.forEach((elem) => params.append(key, '' + elem))
        } else {
          params.append(key, '' + val)
        }
      }
    }
  }

  return params.toString()
}

function buildResponse<T = any>(response: Response) {
  return response.text().then((text) => {
    let json: any
    let error: Error | undefined

    try {
      json = JSON.parse(text)
    } catch (err: any) {
      json = text
      error = err
    }

    const object: FetchResponse<T> = {
      error,
      json,
      text,
      headers: response.headers,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      redirected: response.redirected,
      type: response.type,
      url: response.url
    }

    return object
  })
}

function fetchWithJSONImpl<T = any>(
  options: FetchOptions,
  rawResponse?: boolean
) {
  const { baseURL, json, query, encodeQuery } = options
  const req = omit<RequestInit>(options, [
    'url',
    'baseURL',
    'data',
    'query',
    'encodeQuery'
  ])

  let url = '' + options.url

  if (baseURL && isRelativeURL(url)) {
    url = baseURL.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '')
  }

  if (query) {
    url = addQueryString(url, (encodeQuery || defaultEncodeQuery)(query))
  }

  const headers = new Headers(req.headers)

  req.headers = headers

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, */*')
  }

  if (req.body == null && json != null) {
    req.body = JSON.stringify(json)

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }

  return rawResponse ? fetch(url, req) : fetch(url, req).then(buildResponse<T>)
}

const fetchWithJSON = fetchWithJSONImpl as FetchMethod

export default fetchWithJSON
