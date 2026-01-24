const mongoose = require('mongoose');

const lawyerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, required: true },
    email: { type: String, required: true },

    barRegistrationNumber: { type: String, required: true, unique: true },
    verifiedBarStatus: { type: Boolean, default: false },
    activeStatus: { type: Boolean, default: true },

    yearsOfExperience: { type: Number, default: 0 },

    primaryPracticeArea: { type: String, required: true }, // "criminal", "family", etc.
    secondaryPracticeAreas: [String],

    location: {
        city: String,
        district: String,
        state: String,
        coordinates: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
        }
    },

    caseStats: {
        totalCasesHandled: { type: Number, default: 0 },
        successRate: { type: Number, default: 0 }, // 0 to 100
        recentCasesLast6Months: { type: Number, default: 0 }
    },

    categoryStats: {
        criminal: {
            successRate: { type: Number, default: 0 },
            casesHandled: { type: Number, default: 0 }
        },
        family: {
            successRate: { type: Number, default: 0 },
            casesHandled: { type: Number, default: 0 }
        }
    },

    responsiveness: {
        avgResponseTimeMinutes: { type: Number, default: 0 },
        acceptanceRate: { type: Number, default: 0 }
    },

    rating: {
        averageRating: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 }
    },

    disciplinaryActionsCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

// Create 2dsphere index for geoNear queries
lawyerSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model('Lawyer', lawyerSchema);
