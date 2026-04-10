/**
 * Route: /api/files
 * Azure Blob Storage — upload, download, delete file
 * Thay thế multer local disk storage
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadFile, generateSasUrl, deleteFile } = require('../services/blobStorage');

const router = express.Router();

// multer: lưu vào memory buffer, không lưu disk nữa
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'image/png', 'image/jpeg'];
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('text/'));
  },
});

/**
 * POST /api/files/upload
 * Upload file lên Azure Blob Storage
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { projectId = 'shared', folder = 'documents' } = req.body;
    const result = await uploadFile(req.file.buffer, req.file.originalname, folder, projectId);

    if (!result) {
      return res.status(503).json({ error: 'Azure Blob Storage not configured' });
    }

    res.json({
      success: true,
      blobName: result.blobName,
      originalName: result.originalName,
      size: result.size,
      url: result.url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/files/:blobName
 * Lấy SAS URL có thời hạn để download file
 */
router.get('/download', authenticate, async (req, res) => {
  try {
    const { blobName, expiresIn = 60 } = req.query;
    if (!blobName) return res.status(400).json({ error: 'blobName required' });

    const sasUrl = await generateSasUrl(blobName, parseInt(expiresIn));
    if (!sasUrl) return res.status(503).json({ error: 'Azure Blob Storage not configured' });

    res.json({ sasUrl, expiresInMinutes: parseInt(expiresIn) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/files/:blobName
 * Xoá file khỏi Azure Blob Storage
 */
router.delete('/delete', authenticate, async (req, res) => {
  try {
    const { blobName } = req.query;
    if (!blobName) return res.status(400).json({ error: 'blobName required' });
    
    const success = await deleteFile(blobName);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
