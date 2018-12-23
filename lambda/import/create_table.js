const AWS = require('aws-sdk')

AWS.config.update({
  region: 'ap-northeast-1'
})

const dynamodb = new AWS.DynamoDB()
const params = {
  TableName: 'Entries',
  KeySchema: [
    { AttributeName: 'DreamType', KeyType: 'HASH' }, //Partition key
    { AttributeName: 'PublishedAt', KeyType: 'RANGE' } //Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'DreamType', AttributeType: 'S' },
    { AttributeName: 'PublishedAt', AttributeType: 'S' }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
}

dynamodb.createTable(params, (err, data) => {
  if (err) {
    console.error('ERROR:', JSON.stringify(err, null, 2))
  } else {
    console.log('Created table:', JSON.stringify(data, null, 2))
  }
})