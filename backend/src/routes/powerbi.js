/**
 * Route: /api/powerbi
 * Power BI Embedded — cấp embed token cho frontend
 * Thay thế: Recharts (frontend) → Power BI Embedded reports
 */

const express = require('express');
const https = require('https');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const {
  POWERBI_CLIENT_ID,
  POWERBI_CLIENT_SECRET,
  POWERBI_TENANT_ID,
  POWERBI_WORKSPACE_ID,
  POWERBI_REPORT_ID,
} = process.env;

async function getAzureADToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: POWERBI_CLIENT_ID,
      client_secret: POWERBI_CLIENT_SECRET,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    }).toString();

    const options = {
      hostname: 'login.microsoftonline.com',
      path: `/${POWERBI_TENANT_ID}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data.access_token);
          } else {
            console.error('Azure AD Token Error:', data);
            reject(new Error(data.error_description || `Azure AD Error: ${res.statusCode}`));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getReportDetails(accessToken, reportId, workspaceId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.powerbi.com',
      path: `/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) resolve(result);
          else reject(new Error(result.error?.message || `Failed to get report details: ${res.statusCode}`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Lấy embed token từ Power BI REST API
 */
async function getEmbedToken(accessToken, reportId, workspaceId, datasetId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      reports: [{ id: reportId }],
      datasets: datasetId ? [{ id: datasetId }] : [],
      targetWorkspaces: [{ id: workspaceId }],
    });

    const options = {
      hostname: 'api.powerbi.com',
      path: '/v1.0/myorg/GenerateToken',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            console.error('Power BI API Error:', result);
            reject(new Error(result.error?.message || `Power BI API Error: ${res.statusCode}`));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * GET /api/powerbi/embed-token?reportId=<id>&workspaceId=<id>
 * Cấp embed token cho Power BI Embedded SDK ở frontend
 */
router.get('/embed-token', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    if (!POWERBI_CLIENT_ID || !POWERBI_CLIENT_SECRET || !POWERBI_TENANT_ID) {
      return res.json({
        configured: false,
        message: 'Power BI not configured. Add POWERBI_* variables to .env',
        mockToken: 'demo-mode-no-powerbi',
      });
    }

    const reportId = req.query.reportId || POWERBI_REPORT_ID;
    const workspaceId = req.query.workspaceId || POWERBI_WORKSPACE_ID;

    if (!reportId || !workspaceId) {
      return res.status(400).json({ error: 'reportId and workspaceId required' });
    }

    const accessToken = await getAzureADToken();
    
    // Tự động tìm Dataset ID gắn với báo cáo
    const reportData = await getReportDetails(accessToken, reportId, workspaceId);
    if (!reportData.datasetId) {
      throw new Error('Could not find datasetId for the specified report.');
    }

    const embedTokenData = await getEmbedToken(accessToken, reportId, workspaceId, reportData.datasetId);

    res.json({
      configured: true,
      embedToken: embedTokenData.token,
      embedUrl: reportData.embedUrl || `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      reportId,
      workspaceId,
      datasetId: reportData.datasetId,
      expiresAt: embedTokenData.expiration,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/powerbi/reports
 * Liệt kê tất cả reports trong workspace
 */
router.get('/reports', authenticate, async (req, res) => {
  try {
    if (!POWERBI_CLIENT_ID) {
      return res.json({ configured: false, reports: [] });
    }

    const accessToken = await getAzureADToken();

    const reports = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.powerbi.com',
        path: `/v1.0/myorg/groups/${POWERBI_WORKSPACE_ID}/reports`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      };
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    res.json({ configured: true, reports: reports.value || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
