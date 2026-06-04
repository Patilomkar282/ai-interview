const AWS = require('aws-sdk');
require('dotenv').config();

// Configure Polly using environment variables
const polly = new AWS.Polly({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = polly;