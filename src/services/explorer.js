import axios from 'axios'

// dependencies are injected for easier testing
export const createExplorer = (fetcher, url) => {
  function getUrl (path) {
    return [url, path].join('/')
  }

  async function checkTransactions (path) {
    return fetcher.get(getUrl(path))
  }

  return Object.freeze({
    checkTransactions
  })
}

export default createExplorer(axios, process.env.EXPLORER_URL)
