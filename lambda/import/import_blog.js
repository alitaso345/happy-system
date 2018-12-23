const axios = require('axios')
const parser = require('xml2json')

async function main() {
  const diaryContents = await exportContentsFromBlog()
  console.log(JSON.stringify(diaryContents, '', ' '))
}

async function exportContentsFromBlog() {
  let client = axios.create({ baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom/entry' })
  let result = []
  let data = await getData(client)
  result = result.concat(data.contents)

  while (data.next_url != 'http://alitaso345.hatenadiary.jp/') {
    client = axios.create({ baseURL: data.next_url })
    data = await getData(client)
    result = result.concat(data.contents)
  }
  return result
}

async function getData(client) {
  const response = await client.request({
    method: 'get',
    auth: {
      username: process.env['HATENA_ID'],
      password: process.env['HATENA_API_KEY']
    }
  }).then(res => {
    const data = new Object()
    const json = JSON.parse(parser.toJson(res.data))
    data.contents = json.feed.entry.map(el => {
      const obj = {}
      obj.title = el.title
      obj.content = el.content["$t"]
      obj.createdAt = new Date(el.published)
      return obj
    })
    data.next_url = json.feed.link[1].href
    return data
  })
  return response
}

main()