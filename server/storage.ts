import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('[Storage] R2 credentials not fully configured — file uploads will be unavailable');
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
}

const BUCKET = process.env.R2_BUCKET_NAME || 'docket-files';

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
  const client = getR2Client();
  if (!client) throw new Error('File storage is not configured');

  const storageKey = buildStorageKey(companyId, caseId, fileName);
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: storageKey, ContentType: mimeType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes
  return { uploadUrl, storageKey };
}

// Returns a short-lived URL the browser can GET the file from, scoped to one download.
export async function getDownloadUrl(storageKey: string): Promise<string> {
  const client = getR2Client();
  if (!client) throw new Error('File storage is not configured');

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function deleteFile(storageKey: string): Promise<void> {
  const client = getR2Client();
  if (!client) throw new Error('File storage is not configured');

  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}
