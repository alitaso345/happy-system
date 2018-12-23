const AWS = require('aws-sdk')
const axios = require('axios')
const parser = require('xml2json')
const TABLE_NAME = 'Entries'

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

    // たまたま1件だけのページだとオブジェクトで返ってくる
    const entries = Array.isArray(json.feed.entry) === true ? json.feed.entry : Array(json.feed.entry)
    data.contents = entries.map(el => {
      const obj = {}
      obj.type = 'Dream'
      obj.title = el.title
      obj.content = el.content["$t"].replace(/\r?\n/g, '')
      obj.publishedAt = new Date(el.published).toISOString()
      return obj
    })
    data.next_url = json.feed.link[1].href
    return data
  })
  return response
}

AWS.config.update({
  region: 'ap-northeast-1'
})

exports.handler = async () => {
  const docClient = new AWS.DynamoDB.DocumentClient()
  const diaryContents = await exportContentsFromBlog()
  diaryContents.forEach(content => {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        "type": content.type,
        "publishedAt": content.publishedAt,
        "title": content.title,
        "content": content.content
      }
    }

    docClient.put(params, (err, data) => {
      if (err) {
        console.error("ERROR: ", JSON.stringify(err, null, 2))
      } else {
        console.log("Added Item:", JSON.stringify(data, null, 2))
      }
    })
  })
}