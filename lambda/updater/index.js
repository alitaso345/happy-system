const AWS = require('aws-sdk')
const axios = require('axios')
const parser = require('xml2json')
const TABLE_NAME = 'Entries'

const getNewestEntries = async () => {
  const client = axios.create({ baseURL: 'https://blog.hatena.ne.jp/alice345/alitaso345.hatenadiary.jp/atom/entry' })
  const response = await client.request({
    method: 'get',
    auth: {
      username: process.env['HATENA_ID'],
      password: process.env['HATENA_API_KEY']
    }
  }).then(res => {
    const json = JSON.parse(parser.toJson(res.data))

    // たまたま1件だけのページだとオブジェクトで返ってくる
    const entries = Array.isArray(json.feed.entry) === true ? json.feed.entry : Array(json.feed.entry)
    const result =  entries.map(el => {
      const obj = {}
      obj.type = 'Dream'
      obj.title = el.title
      obj.content = el.content["$t"].replace(/\r?\n/g, '')
      obj.publishedAt = new Date(el.published).toISOString()
      return obj
    })
    return result
  })

  return response
}

exports.handler = async () => {
  console.log('Start update happy system')
  const docClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-northeast-1' })
  const newestEntries = await getNewestEntries()
  
  for(let entry of newestEntries) {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        "type": entry.type,
        "publishedAt": entry.publishedAt,
        "title": entry.title,
        "content": entry.content
      }
    }

    try {
      await docClient.put(params).promise()
      console.error("Added diary: ", entry.title)
    } catch (err) {
      console.error("Unable to add diary: ", entry.title, ". Error JSON:", JSON.stringify(err, null, 2))
    }
  }
}