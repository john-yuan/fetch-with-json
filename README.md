# Fetch with JSON

[![npm version](https://img.shields.io/npm/v/fetch-with-json.svg)](https://www.npmjs.com/package/fetch-with-json)
[![install size](https://packagephobia.now.sh/badge?p=fetch-with-json)](https://packagephobia.now.sh/result?p=fetch-with-json)
[![npm downloads](https://img.shields.io/npm/dm/fetch-with-json.svg)](http://npm-stat.com/charts.html?package=fetch-with-json)

Some tweaks to the [Fetch API][fetch_api] to make it easier to communicate with the server using JSON.

Using this library, you don't need to manually set the request header "Content-Type" to "application/json" every time you send JSON to the server.

This library does the following for you:

- Stringify the request data (the `json` field in the options) with `JSON.stringify` before sending it to the server as request body. [See the example here](#1-posting-json-data).
- Set the request header `Content-Type` to `application/json` and `Accept` to `application/json, */*` if they are not set.
- Always try to parse response body as JSON no matter what the response header `Content-Type` is and assign the parsed result to `response.json`. If error has be thrown during parsing, `response.json` will be set to the text of the original response body, and the error will be assigned to `response.error`.

**This library is a zero dependencies module and will always be.** This library only extends the [fetch options][fetch_params], not overrides it. So you can use the functionality provided by the original [Fetch API][fetch_api]. For example, you can use this library to [upload files](#4-uploading-a-file) just like you would with [Fetch API][fetch_api]. And [you can get the original Response if you want](#5-getting-the-original-response).

[fetch_api]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[fetch_params]: https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters

Examples:

- [1. Posting JSON data](#1-posting-json-data)
- [2. Using query](#2-using-query)
- [3. Creating your own request with default options](#3-creating-your-own-request-with-default-options)
- [4. Uploading a file](#4-uploading-a-file)
- [5. Getting the original Response](#5-getting-the-original-response)

## Installation

```bash
npm i fetch-with-json
```

## Examples

### 1. Posting JSON data

```ts
import request from 'fetch-with-json'

request({
  method: 'POST',
  url: '/posts',
  json: {
    title: 'Fetch API',
    content: 'The Fetch API provides an interface for fetching resources.'
  }
}).then((res) => {
  console.log(`post created, id = ${res.json.id}`)
})
```

The type of `res` is [FetchResponse](#fetchresponse) and the `json` field of `res` is the parsed JSON object.

### 2. Using query

```ts
import request from 'fetch-with-json'

// GET /posts?page=1&size=10&category=typescript
request({
  url: '/posts',
  query: {
    page: 1,
    size: 10,
    category: 'typescript'
  }
})
```

The `query` object will be encoded to query string with a [default](#the-default-encodequery-function) `encodeQuery` function. If the default `encodeQuery` function does not meet your needs, you can override it by setting the `encodeQuery` option. This is very useful when you are creating your own request method based on this library. [See the coming example for more details](#3-creating-your-own-request-with-default-options).

### 3. Creating your own request with default options

```ts
import qs from 'qs'
import fetchWithJSON, { FetchOptions } from 'fetch-with-json'

// Encode query with `qs` module
function encodeQuery(query: Record<string, any>) {
  return qs.stringify(query)
}

export default async function request(options: FetchOptions) {
  // Set baseURL if it is not set
  options.baseURL = options.baseURL || 'https://example.com/v2'

  // Set encodeQuery if it is not set to override the default one
  options.encodeQuery = options.encodeQuery || encodeQuery

  // Extend the original headers
  options.headers = new Headers(options.headers)

  // Set X-My-Custom-Header if it is not set
  if (!options.headers.has('X-My-Custom-Header')) {
    options.headers.set('X-My-Custom-Header', 'header-value')
  }

  return fetchWithJSON(options)
}

// GET https://example.com/v2/posts
request({ url: '/posts' })
```

### 4. Uploading a file

```ts
import request from 'fetch-with-json'

const formData = new FormData()
const fileField = document.querySelector('input[type="file"]')

formData.append('avatar', fileField.files[0])

// You can add other fields, e.g:
// formData.append("username", "abc123");

// The Fetch API will set request header "Content-Type" to
// "multipart/form-data" automatically if the type of body
// is FormData.
request({
  method: 'POST',
  url: '/users/profile',
  body: formData
}).then((res) => {
  console.log(res)
})
```

Please note that we are using the `body` field to upload the [FormData][form_data] instead of using the `json` field. The `body` field is declared in [the parameters of the Fetch API][fetch_params]. When `body` is set (not `null` or `undefined`), the `json` field will be ignored.

[form_data]: https://developer.mozilla.org/en-US/docs/Web/API/FormData

### 5. Getting the original Response

If you want to get the original [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) returned by the [Fetch API][fetch_api], please set the second parameter to `true`, below is an example.

```ts
import request from 'fetch-with-json'

request({ url: '/posts/1' }, true).then((res) => {
  // The type of res is Response
  console.log(res)
})
```

## Typescript Declarations

### FetchMethod

The `request` method has two declarations. The primary one is:

```ts
function request<T = any>(options: FetchOptions): Promise<FetchResponse<T>>
```

The above one will always convert the [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) to [FetchResponse](#fetchresponse). If you want to get the original [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response), you can use the second declaration:

```ts
function request(options: FetchOptions, rawResponse: true): Promise<Response>
```

Put them together, below is the declaration of `FetchMethod`:

```ts
interface FetchMethod {
  <T = any>(options: FetchOptions): Promise<FetchResponse<T>>
  <T = any>(options: FetchOptions, rawResponse: true): Promise<Response>
}
```

> Note: We add generic type to the second one just to keep it consistent with the first one (the generic type for the second one actually has no effects).

### FetchOptions

The declaration of `FetchOptions` is:

```ts
interface FetchOptions extends RequestInit {
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
```

For the many other options (the options declared in the `RequestInit` type) provided by the original [Fetch API][fetch_api], [please click here to read the documentation of the fetch parameters on the MDN website][fetch_params].

### FetchResponse

The declaration of `FetchResponse` is:

```ts
interface FetchResponse<T = any> {
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
```

## The default `encodeQuery` function

Here is the implementation of the default `encodeQuery` function for your reference.

```ts
function defaultEncodeQuery(query: Record<string, any>) {
  const hasOwn = Object.prototype.hasOwnProperty
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
```
