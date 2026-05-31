import mongoose from 'mongoose';

const diseaseReportSchema = new mongoose.Schema({
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'farms',
    required: true,
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  diseases: [
    {
      imageUrl: { type: String },
      disease: { type: String, required: true },
      confidence: { type: Number, required: true },
      location: { type: String },
      notes: { type: String },
      createdDate: { type: Date, default: Date.now },
    }
  ],
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const DiseaseReport = mongoose.model('diseaseReports', diseaseReportSchema);
export default DiseaseReport;