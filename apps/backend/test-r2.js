const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const clientEast = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://8e31063731566932952bcd0a85a162ef.eu.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function run() {
  try {
    const res = await clientEast.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: 'test/upload-new.txt',
      Body: 'Hello world',
      ContentType: 'text/plain',
    }));
    console.log('Upload success!');
  } catch (e) {
    console.error('Upload failed:', e.name, e.message);
  }
}

run().catch(console.error);
