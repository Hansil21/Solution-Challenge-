import mongoose from 'mongoose';

const MediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ownerId: { type: String, required: true },
  hash: { type: String, required: true },
  frameUrl: { type: String },
  originalUrl: { type: String },
  platform: { type: String, default: 'KHEL-GUARD' },
  status: { type: String, enum: ['protected', 'flagged'], default: 'protected' },
  createdAt: { type: Date, default: Date.now }
});

export const Media = mongoose.models.Media || mongoose.model('Media', MediaSchema);
