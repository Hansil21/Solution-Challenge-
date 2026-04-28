import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
  victimTitle: { type: String },
  suspectUrl: { type: String, required: true },
  similarityScore: { type: Number, required: true },
  reason: { type: String },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
