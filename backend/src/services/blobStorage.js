/**
 * Azure Blob Storage Service
 * Thay thế multer local disk storage
 * Lưu: biên bản họp, tài liệu dự án, transcript audio, attachment task
 */

const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'project-files';

let blobServiceClient = null;

function getClient() {
  if (!blobServiceClient) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) {
      console.warn('⚠️  Azure Blob Storage not configured — file uploads disabled');
      return null;
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  }
  return blobServiceClient;
}

async function ensureContainer() {
  const client = getClient();
  if (!client) return null;
  const containerClient = client.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists({ access: 'private' });
  return containerClient;
}

/**
 * Upload buffer lên Azure Blob
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Tên file gốc
 * @param {string} folder - Thư mục: 'meetings', 'documents', 'attachments', 'exports'
 * @param {string} projectId - ID dự án để tổ chức thư mục
 * @returns {{ url: string, blobName: string, size: number }}
 */
async function uploadFile(buffer, originalName, folder = 'documents', projectId = 'shared') {
  const containerClient = await ensureContainer();
  if (!containerClient) return null;

  const ext = originalName.split('.').pop();
  const blobName = `${projectId}/${folder}/${uuidv4()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: getMimeType(ext),
      blobContentDisposition: `attachment; filename="${originalName}"`,
    },
    metadata: {
      originalName,
      projectId,
      uploadedAt: new Date().toISOString(),
    },
  });

  return {
    blobName,
    url: blockBlobClient.url,
    size: buffer.length,
    originalName,
  };
}

/**
 * Tạo SAS URL có thời hạn để download an toàn
 * @param {string} blobName - Tên blob đầy đủ (bao gồm thư mục)
 * @param {number} expiresInMinutes - Thời gian hết hạn (default 60 phút)
 */
async function generateSasUrl(blobName, expiresInMinutes = 60) {
  const client = getClient();
  if (!client) return null;

  const containerClient = client.getContainerClient(CONTAINER_NAME);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Parse account name từ connection string
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    // Fallback: trả về URL thẳng nếu không có credentials
    return blockBlobClient.url;
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * Xoá file khỏi Blob Storage
 */
async function deleteFile(blobName) {
  const client = getClient();
  if (!client) return false;
  try {
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    return true;
  } catch (err) {
    console.error('Blob delete error:', err.message);
    return false;
  }
}

/**
 * Đọc nội dung text file từ Blob (dùng cho transcript AI extraction)
 */
async function readTextFile(blobName) {
  const client = getClient();
  if (!client) return null;
  try {
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download(0);
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  } catch (err) {
    console.error('Blob read error:', err.message);
    return null;
  }
}

function getMimeType(ext) {
  const map = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext?.toLowerCase()] || 'application/octet-stream';
}

module.exports = { uploadFile, generateSasUrl, deleteFile, readTextFile };
