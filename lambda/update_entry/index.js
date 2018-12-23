const AWS = require('aws-sdk')
const axios = require('axios')
const parser = require('xml2json')
const TABLE_NAME = 'Entries'

async function getNewestEntries() {
  const client = axios.create({ baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom/entry' })
  const response = await client.request({
    method: 'get',
    auth: {
      username: process.env['HATENA_ID'],
      password: process.env['HATENA_API_KEY']
    }
  }).then(res => {
    const json = JSON.parse(parser.toJson(res.data))
    entries = json.feed.entry.map(el => {
      const obj = {}
      obj.dreamType = /明晰夢/.exec(el.title) === null ? 'Normal' : 'lucid'
      obj.title = el.title
      obj.content = el.content["$t"]
      obj.publishedAt = new Date(el.published)
      return obj
    })
    return entries
  })
  return response
}

AWS.config.update({
  region: 'ap-northeast-1'
})

exports.handler = async () => {
  const docClient = new AWS.DynamoDB.DocumentClient()
  const newestEntries = await getNewestEntries()
  console.log(JSON.stringify(newestEntries, null, 2))
  
  newestEntries.forEach(content => {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        "DreamType": content.dreamType,
        "PublishedAt": content.publishedAt.toString(),
        "Title": content.title,
        "Content": content.content
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