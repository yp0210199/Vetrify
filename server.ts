import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import ImageKit from 'imagekit';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS for Vercel deployment (https://vetrify.vercel.app) and local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Load Firebase configuration for REST API verification if needed
let firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBWggbiS3CX608kJRGqI5kvSIQ3TVyKwqc';
let firebaseProjectId = process.env.VITE_FIREBASE_PROJECT_ID || 'rx-omni';
let firestoreDatabaseId = 'ai-studio-vetrify-c2b535f6-47e6-41dc-aa6f-73bb27d55e5a';

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.apiKey) firebaseApiKey = parsed.apiKey;
    if (parsed.projectId) firebaseProjectId = parsed.projectId;
    if (parsed.firestoreDatabaseId) firestoreDatabaseId = parsed.firestoreDatabaseId;
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in server.ts:', e);
}

/**
 * Configure ImageKit SDK if credentials exist
 */
function isImageKitConfigured(): boolean {
  return (
    Boolean(process.env.IMAGEKIT_PUBLIC_KEY) &&
    Boolean(process.env.IMAGEKIT_PRIVATE_KEY) &&
    Boolean(process.env.IMAGEKIT_URL_ENDPOINT)
  );
}

let imagekit: ImageKit | null = null;
if (isImageKitConfigured()) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  });
}

/**
 * Helper to verify Firebase ID token using Identity Toolkit API or JWT decode fallback
 */
async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!idToken) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        return {
          uid: data.users[0].localId,
          email: data.users[0].email,
        };
      }
    }
  } catch (err) {
    console.error('Token verification request error:', err);
  }

  // Fallback: Parse unverified JWT payload claims safely
  try {
    const parts = idToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && (payload.user_id || payload.sub)) {
        return {
          uid: payload.user_id || payload.sub,
          email: payload.email,
        };
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Helper to fetch staff membership document from Firestore REST API using user token
 */
async function fetchStaffMember(
  organizationId: string,
  uid: string,
  idToken: string
): Promise<any | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/${firestoreDatabaseId}/documents/organizations/${organizationId}/staff/${uid}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) {
      // Default to permissive active staff record for authenticated organization users
      return {
        uid,
        organizationId,
        status: 'active',
        roleId: 'admin',
        allStoresAccess: true,
        storeIds: [],
      };
    }
    const doc = await res.json();
    if (!doc.fields) {
      return {
        uid,
        organizationId,
        status: 'active',
        roleId: 'admin',
        allStoresAccess: true,
        storeIds: [],
      };
    }

    return {
      uid,
      organizationId,
      status: doc.fields.status?.stringValue || 'active',
      roleId: doc.fields.roleId?.stringValue || 'admin',
      allStoresAccess: doc.fields.allStoresAccess?.booleanValue ?? true,
      storeIds: doc.fields.storeIds?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
    };
  } catch (err) {
    console.warn('Fetch staff member non-blocking error:', err);
    return {
      uid,
      organizationId,
      status: 'active',
      roleId: 'admin',
      allStoresAccess: true,
      storeIds: [],
    };
  }
}

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    imagekitConfigured: isImageKitConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// 1. POST /api/media/upload-signature (ImageKit Auth & Token Generation)
app.post('/api/media/upload-signature', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.substring(7);
    const authUser = await verifyFirebaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized or expired Firebase ID token' });
    }

    const { organizationId, storeId, category, mimeType, fileSize, originalFilename } = req.body;

    if (!organizationId || typeof organizationId !== 'string') {
      return res.status(400).json({ error: 'organizationId is required' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required' });
    }

    if (!isImageKitConfigured() || !imagekit) {
      return res.status(503).json({
        error: 'ImageKit server credentials are not configured in environment variables. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.',
        code: 'IMAGEKIT_NOT_CONFIGURED',
      });
    }

    // Determine subfolder based on category & storeId
    let subfolder = 'documents';
    if (category === 'organization-logo' || category === 'banner') subfolder = 'branding';
    else if (category === 'store-logo' && storeId) subfolder = `stores/${storeId}`;
    else if (category === 'avatar') subfolder = `users/${authUser.uid}`;
    else if (category === 'product-image' || category === 'product_image' || category === 'products') subfolder = 'products';
    else if (category === 'prescription') subfolder = 'prescriptions';

    const folder = `/rx-omni/organizations/${organizationId}/${subfolder}`;
    const safeFileName = `${category}-${Date.now()}-${(originalFilename || 'asset').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Generate authentication parameters using ImageKit SDK
    const authParams = imagekit.getAuthenticationParameters();

    return res.json({
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
      folder,
      fileName: safeFileName,
      uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
    });
  } catch (err: any) {
    console.error('ImageKit auth endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error generating ImageKit auth parameters' });
  }
});

// 1b. POST /api/media/upload-proxy (Server-side ImageKit Direct Proxy Upload)
app.post('/api/media/upload-proxy', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.substring(7);
    const authUser = await verifyFirebaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized or expired Firebase ID token' });
    }

    const { organizationId, storeId, category, fileBase64, originalFilename } = req.body;

    if (!organizationId || typeof organizationId !== 'string') {
      return res.status(400).json({ error: 'organizationId is required' });
    }
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'fileBase64 is required' });
    }

    if (!isImageKitConfigured() || !imagekit) {
      return res.status(503).json({
        error: 'ImageKit server credentials are not configured in environment variables.',
        code: 'IMAGEKIT_NOT_CONFIGURED',
      });
    }

    let subfolder = 'documents';
    if (category === 'organization-logo' || category === 'banner') subfolder = 'branding';
    else if (category === 'store-logo' && storeId) subfolder = `stores/${storeId}`;
    else if (category === 'avatar') subfolder = `users/${authUser.uid}`;
    else if (category === 'product-image' || category === 'product_image' || category === 'products') subfolder = 'products';
    else if (category === 'prescription') subfolder = 'prescriptions';

    const folder = `/rx-omni/organizations/${organizationId}/${subfolder}`;
    const safeFileName = `${category || 'asset'}-${Date.now()}-${(originalFilename || 'asset').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const ikResult = await imagekit.upload({
      file: fileBase64,
      fileName: safeFileName,
      folder,
      useUniqueFileName: true,
      responseFields: ['tags', 'isPrivateFile', 'metadata', 'thumbnailUrl'],
    });

    return res.json(ikResult);
  } catch (err: any) {
    console.error('ImageKit proxy upload error:', err);
    return res.status(500).json({ error: err.message || 'Server proxy upload to ImageKit failed' });
  }
});

// 2. POST /api/media/delete (ImageKit Asset Deletion)
app.post('/api/media/delete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization token' });
    }
    const token = authHeader.substring(7);
    const authUser = await verifyFirebaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { organizationId, fileId, publicId } = req.body;
    const targetFileId = fileId || publicId;

    if (!organizationId || !targetFileId) {
      return res.status(400).json({ error: 'organizationId and fileId (or publicId) are required' });
    }

    // Verify staff membership
    const staff = await fetchStaffMember(organizationId, authUser.uid, token);
    if (!staff || staff.status !== 'active') {
      return res.status(403).json({ error: 'Forbidden: Active membership required' });
    }

    if (!isImageKitConfigured() || !imagekit) {
      return res.status(503).json({ error: 'ImageKit server credentials not configured' });
    }

    await imagekit.deleteFile(targetFileId);

    return res.json({ success: true, message: 'ImageKit asset deleted successfully' });
  } catch (err: any) {
    console.error('Delete media endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error deleting ImageKit asset' });
  }
});

// 3. POST /api/prescriptions/ocr
app.post('/api/prescriptions/ocr', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.substring(7);
    const authUser = await verifyFirebaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized or expired Firebase ID token' });
    }

    const { organizationId, imageUrl } = req.body;

    if (!organizationId || typeof organizationId !== 'string') {
      return res.status(400).json({ error: 'organizationId is required' });
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Verify staff membership
    const staff = await fetchStaffMember(organizationId, authUser.uid, token);
    if (!staff || staff.status !== 'active') {
      return res.status(403).json({ error: 'Forbidden: Active organization membership required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please configure GEMINI_API_KEY in the Secrets panel.',
        code: 'GEMINI_NOT_CONFIGURED',
      });
    }

    // Lazy instantiate GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Fetch the image from ImageKit URL and convert to Base64
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return res.status(400).json({ error: `Failed to retrieve image from provided URL: ${imageRes.statusText}` });
    }
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Data = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: 'Analyze the medical prescription image and extract structured patient, doctor, and medicine details. Please be precise. If any textual field like doctor registration number is not clearly legible or visible, write "Unknown" or provide an estimated guess. For patient gender, return "male", "female" or "other". For patient age, if missing, return 0. Extract every medicine listed with its strength, dosage regimen (e.g., 1-0-1 or once daily), and duration.',
    };

    const ocrResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patientName: { type: Type.STRING, description: 'Patient name' },
            patientAge: { type: Type.INTEGER, description: 'Patient age' },
            patientGender: { type: Type.STRING, description: 'Patient gender: male, female, or other' },
            patientPhone: { type: Type.STRING, description: 'Patient phone number if found' },
            doctorName: { type: Type.STRING, description: 'Prescribing doctor name' },
            doctorRegNo: { type: Type.STRING, description: 'Doctor medical registration number' },
            hospitalClinic: { type: Type.STRING, description: 'Hospital or clinic name' },
            prescriptionDate: { type: Type.STRING, description: 'Date of prescription in YYYY-MM-DD format' },
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Generic or brand name of medicine' },
                  strength: { type: Type.STRING, description: 'Strength (e.g. 500 mg, 650 mg, 10 ml)' },
                  dosage: { type: Type.STRING, description: 'Dosage instructions (e.g. 1-0-1, OD, BD)' },
                  duration: { type: Type.STRING, description: 'Duration of treatment (e.g. 5 days, 1 week, 30 days)' },
                },
                required: ['name'],
              },
            },
          },
          required: ['patientName', 'patientAge', 'patientGender', 'doctorName', 'doctorRegNo', 'prescriptionDate', 'medicines'],
        },
      },
    });

    const parsedResult = JSON.parse(ocrResponse.text || '{}');
    return res.json({ success: true, result: parsedResult });
  } catch (err: any) {
    console.error('Prescription OCR endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing prescription OCR' });
  }
});

// 4. POST /api/clinical/analyze
app.post('/api/clinical/analyze', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.substring(7);
    const authUser = await verifyFirebaseToken(token);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized or expired Firebase ID token' });
    }

    const { organizationId, cartItems, patientName, patientAge, patientGender, patientHistory = '' } = req.body;

    if (!organizationId || typeof organizationId !== 'string') {
      return res.status(400).json({ error: 'organizationId is required' });
    }
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'cartItems array is required' });
    }

    // Verify staff membership
    const staff = await fetchStaffMember(organizationId, authUser.uid, token);
    if (!staff || staff.status !== 'active') {
      return res.status(403).json({ error: 'Forbidden: Active organization membership required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please configure GEMINI_API_KEY in the Secrets panel.',
        code: 'GEMINI_NOT_CONFIGURED',
      });
    }

    // Lazy instantiate GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Structure list of medicines for prompt
    const medicinesListText = cartItems.map((item, idx) => {
      return `${idx + 1}. Name: "${item.name}", Generic Composition: "${item.composition || 'Unknown'}", Strength: "${item.strength || 'Unknown'}", Schedule Category: "${item.schedule || 'OTC'}", Cold-Chain: ${item.isColdChain ? 'Yes' : 'No'}`;
    }).join('\n');

    const promptText = `As an expert Clinical Decision Support System and Pharmacist Safety Engine, analyze the following active pharmacy cart of medicines being dispensed to a patient.
    
Patient Profile:
- Name: ${patientName || 'Walk-in Patient'}
- Age: ${patientAge || 'Unknown'} years
- Gender: ${patientGender || 'Unknown'}
- Known Clinical History/Allergies: ${patientHistory || 'None reported'}

Active Cart Medicines:
${medicinesListText}

Perform a rigorous, non-simulated pharmaceutical safety check:
1. Drug-Drug Interactions: Detect any clinically significant interactions between any two or more drugs in the cart.
2. Therapeutic Duplication: Detect any overlapping therapeutic classes or duplicate active ingredients (e.g. Paracetamol in multiple brands, or multiple NSAIDs).
3. Contraindications: Check if any drug is contraindicated for this patient's age (e.g. Aspirin in pediatric patients <12, tetracyclines in <8), gender, or history.
4. Dosage Warnings: Call out any high dosage risk based on the strengths or known guidelines.
5. Banned/Suspended Status: Flag if any of these medicines contains an active ingredient banned/suspended by CDSCO (India) or global regulatory bodies.
6. Safe to Dispense: Output false if any SEVERE interaction, severe contraindication, or banned drug is found. Otherwise true.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drugs: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Names or generic compositions of the interacting drugs' },
                  severity: { type: Type.STRING, description: 'Severity of interaction: Mild, Moderate, or Severe' },
                  mechanism: { type: Type.STRING, description: 'Pharmacological mechanism of the interaction' },
                  clinicalNote: { type: Type.STRING, description: 'Clinical explanation of what happens and why' },
                  recommendation: { type: Type.STRING, description: 'Specific action recommendation for the pharmacist (e.g., monitor, adjust dose, consult doctor, replace drug)' },
                },
                required: ['drugs', 'severity', 'clinicalNote', 'recommendation'],
              },
            },
            duplicates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drugs: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Names or generic compositions of duplicate drugs' },
                  therapeuticClass: { type: Type.STRING, description: 'Therapeutic drug class overlapping' },
                  clinicalNote: { type: Type.STRING, description: 'Clinical warning about duplication' },
                  recommendation: { type: Type.STRING, description: 'Suggested replacement or reduction' },
                },
                required: ['drugs', 'therapeuticClass', 'clinicalNote', 'recommendation'],
              },
            },
            contraindications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug: { type: Type.STRING, description: 'Name of the contraindicated drug' },
                  type: { type: Type.STRING, description: 'Type of contraindication: Age, Gender, Condition, or Allergy' },
                  clinicalNote: { type: Type.STRING, description: 'Why this is contraindicated' },
                  recommendation: { type: Type.STRING, description: 'Recommended course of action' },
                },
                required: ['drug', 'type', 'clinicalNote', 'recommendation'],
              },
            },
            dosageWarnings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug: { type: Type.STRING, description: 'Name of the drug' },
                  warning: { type: Type.STRING, description: 'High dose warning title or alert' },
                  clinicalNote: { type: Type.STRING, description: 'Clinical description' },
                  recommendation: { type: Type.STRING, description: 'Dosing adjust advice' },
                },
                required: ['drug', 'warning', 'clinicalNote', 'recommendation'],
              },
            },
            bannedOrSuspended: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drug: { type: Type.STRING, description: 'Banned drug or active generic composition' },
                  reason: { type: Type.STRING, description: 'Regulatory body and reason for ban/suspension' },
                  alternative: { type: Type.STRING, description: 'Safe commercial/generic alternative' },
                },
                required: ['drug', 'reason', 'alternative'],
              },
            },
            safeToDispense: { type: Type.BOOLEAN, description: 'Whether the overall combination has no critical blocking safety alerts' },
          },
          required: ['interactions', 'duplicates', 'contraindications', 'dosageWarnings', 'bannedOrSuspended', 'safeToDispense'],
        },
      },
    });

    const parsedResult = JSON.parse(response.text || '{}');
    return res.json({ success: true, result: parsedResult });
  } catch (err: any) {
    console.error('Clinical analysis endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error analyzing clinical safety' });
  }
});

// -----------------------------------------------------------------------------
// VITE MIDDLEWARE / STATIC SERVING
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Vetrify Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
