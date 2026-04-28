import mongoose from 'mongoose';

const OfficialVideoSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  colorHash: { type: String, required: true },
  audioHash: { type: String, required: true },
  durationEstimate: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'protected' }
});

export const OfficialVideo = mongoose.models.OfficialVideo || mongoose.model('OfficialVideo', OfficialVideoSchema);
