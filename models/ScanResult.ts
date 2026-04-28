import mongoose from 'mongoose';

const ScanResultSchema = new mongoose.Schema({
  suspectUrl: { type: String, required: true },
  comparedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'OfficialVideo', required: true },
  similarityScore: { type: Number, required: true },
  status: { type: String, required: true },
  severity: { type: String, required: true },
  officialHash: { type: String },
  suspectHash: { type: String },
  scannedAt: { type: Date, default: Date.now }
});

export const ScanResult = mongoose.models.ScanResult || mongoose.model('ScanResult', ScanResultSchema);
