import crypto from 'crypto';

// Lazy-load the AWS SDK so a missing package never crashes the server at startup
let S3Client: any, PutObjectCommand: any, GetObjectCommand: any, DeleteObjectCommand: any, getSignedUrl: any;
let sdkLoaded = false;

async function loadSdk() {
  if (sdkLoaded) return;
  try {
    const s3 = await import('@aws-sdk/client-s3');
    const presigner = await import('@aws-sdk/s3-request-presigner');
    S3Client = s3.S3Client;
    PutObjectCommand = s3.PutObjectCommand;
    GetObjectCommand = s3.GetObjectCommand;
    DeleteObjectCommand = s3.DeleteObjectCommand;
    getSignedUrl = presigner.getSignedUrl;
    sdkLoaded = true;
  } catch (err) {
    throw new Error('File storage SDK (@aws-sdk/client-s3) is not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
  }
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in Railway Variables');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
}

const BUCKET = (process.env.R2_BUCKET_NAME || 'docket-files').trim();

// Builds a tenant-isolated storage path. Company A can never construct a key
// that lands inside Company B's folder, because the companyId is always
// taken from the authenticated session server-side, never from client input.
function buildStorageKey(companyId: string, caseId: string, originalFileName: string): string {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = crypto.randomBytes(8).toString('hex');
  return `${companyId}/${caseId}/${uniquePrefix}-${safeName}`;
}

// Returns a short-lived URL the browser can PUT the raw file bytes to directly.
// The file never passes through our Express server.
export async function getUploadUrl(companyId: string, caseId: string, fileName: string, mimeType: string) {
  await loadSdk();
  const client = getR2Client();
  const storageKey = buildStorageKey(companyId, caseId, fileName);
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, ContentType: mimeType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl, storageKey };
}

// Proxies raw file uploads through Express backend directly to R2.
// This completely bypasses direct client-side S3 PUT requests and avoids local/browser SSL cipher errors.
export async function uploadFileDirect(companyId: string, caseId: string, fileName: string, mimeType: string, body: Buffer) {
  await loadSdk();
  const client = getR2Client();
  const storageKey = buildStorageKey(companyId, caseId, fileName);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mimeType,
    Body: body
  });
  await client.send(command);
  return { storageKey };
}

// Proxies raw file downloads through Express backend.
// This fetches the S3/R2 stream directly from the backend to deliver to the client over standard SSL.
export async function downloadFileDirect(storageKey: string) {
  await loadSdk();
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  const response = await client.send(command);
  return {
    body: response.Body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength
  };
}

// Returns a short-lived URL the browser can GET the file from, scoped to one download.
export async function getDownloadUrl(storageKey: string): Promise<string> {
  await loadSdk();
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function deleteFile(storageKey: string): Promise<void> {
  await loadSdk();
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}
