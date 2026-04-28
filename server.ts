import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import methodOverride from "method-override";
import fs from "fs";
import admin from "firebase-admin";

import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
const auth = admin.auth();

// Operation Types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: "server-side-admin-sdk",
    operationType,
    path
  };
  console.error('Firestore Error Trace:', JSON.stringify(errInfo));
  throw error; // Re-throw to allow standard Express error response
}

const app = express();
const PORT = 3000;

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Global State for EJS
app.use((req: any, res, next) => {
  res.locals.user = null;
  next();
});

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB
});

// Helpers
function generateHash(length = 8) {
  return Math.random().toString(16).substring(2, 2 + length).toUpperCase();
}

// Routes

// Home - Upload Dashboard
app.get("/", async (req: any, res) => {
  const path = "officialVideos";
  try {
    const videosSnapshot = await db.collection(path)
      .orderBy("uploadedAt", "desc")
      .get();
    
    const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render("index", { videos, success: req.query.success });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    res.status(500).send("Error loading dashboard");
  }
});

// Upload Official Video
app.post("/upload", upload.single("video"), async (req: any, res) => {
  const path = "officialVideos";
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const videoId = generateHash(12);
    const videoData = {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      colorHash: generateHash(),
      audioHash: generateHash(),
      durationEstimate: Math.floor(Math.random() * 270) + 30,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'protected',
      userId: "public_user"
    };

    await db.collection(path).doc(videoId).set(videoData);

    res.redirect("/?success=true");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    res.status(500).send("Upload failed");
  }
});

// Delete Asset
app.delete("/delete-asset/:id", async (req: any, res) => {
  try {
    const id = req.params.id;
    const docRef = db.collection("officialVideos").doc(id);

    await docRef.delete();
    
    // Clean up related scans
    const scansSnapshot = await db.collection("scanResults").where("comparedTo", "==", id).get();
    const batch = db.batch();
    scansSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    res.redirect("/");
  } catch (error) {
    res.status(500).send("Deletion failed");
  }
});

// Scanner Page
app.get("/scan", async (req: any, res) => {
  try {
    const videosSnapshot = await db.collection("officialVideos").get();
    const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render("scan", { videos });
  } catch (error) {
    res.status(500).send("Error loading scanner");
  }
});

// Run Scan
app.post("/scan", async (req: any, res) => {
  const path = "scanResults";
  try {
    const { suspectUrl, officialVideoId } = req.body;

    const officialDoc = await db.collection("officialVideos").doc(officialVideoId).get();
    if (!officialDoc.exists) {
      return res.status(404).send("Official video not found");
    }

    const official = officialDoc.data();
    const suspectHash = generateHash();
    const suspectDuration = Math.floor(Math.random() * 270) + 30;
    
    let similarity = Math.floor(Math.random() * 41) + 55;
    if (Math.abs(official!.durationEstimate - suspectDuration) < 30) {
      similarity += 40;
    }
    similarity = Math.min(similarity, 100);

    let status, severity;
    if (similarity >= 80) {
      status = "LEAK DETECTED";
      severity = "HIGH";
    } else if (similarity >= 60) {
      status = "SUSPICIOUS";
      severity = "MEDIUM";
    } else {
      status = "CLEAR";
      severity = "LOW";
    }

    const resultId = generateHash(12);
    const resultData = {
      suspectUrl,
      comparedTo: officialVideoId,
      similarityScore: similarity,
      status,
      severity,
      officialHash: official!.colorHash,
      suspectHash: suspectHash,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: "public_user"
    };

    await db.collection(path).doc(resultId).set(resultData);

    res.redirect(`/results/${resultId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    res.status(500).send("Scan mapping failed");
  }
});

// Results detail
app.get("/results/:id", async (req: any, res) => {
  try {
    const resultDoc = await db.collection("scanResults").doc(req.params.id).get();
    if (!resultDoc.exists) {
      return res.status(404).send("Result not found");
    }

    const result: any = { id: resultDoc.id, ...resultDoc.data() };
    const officialDoc = await db.collection("officialVideos").doc(result.comparedTo).get();
    result.comparedTo = { id: officialDoc.id, ...officialDoc.data() };

    res.render("results", { 
      result, 
      geminiApiKey: process.env.GEMINI_API_KEY 
    });
  } catch (error) {
    res.status(500).send("Error loading results");
  }
});

// History
app.get("/history", async (req: any, res) => {
  const path = "scanResults";
  try {
    const historySnapshot = await db.collection(path)
      .orderBy("scannedAt", "desc")
      .get();
    
    // We need to fetch official video names for each result
    const history = await Promise.all(historySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const officialDoc = await db.collection("officialVideos").doc(data.comparedTo).get();
      return {
        id: doc.id,
        ...data,
        comparedTo: { id: officialDoc.id, ...officialDoc.data() }
      };
    }));

    res.render("history", { history });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    res.status(500).send("Error loading history");
  }
});

// Clear History
app.delete("/history", async (req: any, res) => {
  try {
    const scansSnapshot = await db.collection("scanResults").get();
    const batch = db.batch();
    scansSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.redirect("/history");
  } catch (error) {
    res.status(500).send("Error clearing history");
  }
});

// Get scan data for AI notice
app.get("/api/scan-data/:id", async (req: any, res) => {
  try {
    const resultDoc = await db.collection("scanResults").doc(req.params.id).get();
    if (!resultDoc.exists) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const result = resultDoc.data();
    const officialDoc = await db.collection("officialVideos").doc(result!.comparedTo).get();
    
    if (!officialDoc.exists) return res.status(404).json({ error: "Official asset missing" });

    const official = officialDoc.data();

    res.json({
      fileName: official!.fileName,
      suspectUrl: result!.suspectUrl,
      similarityScore: result!.similarityScore,
      status: result!.status,
      scannedAt: result!.scannedAt?.toDate().toLocaleString() || "N/A"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scan data" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ContentGuard operational at http://localhost:${PORT}`);
});
