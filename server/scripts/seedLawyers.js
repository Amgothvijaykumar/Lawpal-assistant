require('dotenv').config();
const mongoose = require('mongoose');
const Lawyer = require('../models/Lawyer');

const defaultLawyers = [
    {
        fullName: "Adv. Rajesh Kumar",
        email: "rajesh.kumar@example.com",
        barRegistrationNumber: "BR/12345/2010",
        verifiedBarStatus: true,
        activeStatus: true,
        yearsOfExperience: 15,
        primaryPracticeArea: "criminal",
        secondaryPracticeAreas: ["property", "civil"],
        location: {
            city: "Hyderabad",
            district: "Hyderabad",
            state: "Telangana",
            coordinates: {
                type: "Point",
                coordinates: [78.4867, 17.3850]
            }
        },
        caseStats: {
            totalCasesHandled: 450,
            successRate: 85,
            recentCasesLast6Months: 12
        },
        categoryStats: {
            criminal: { successRate: 88, casesHandled: 300 },
            family: { successRate: 75, casesHandled: 50 }
        },
        responsiveness: {
            avgResponseTimeMinutes: 15,
            acceptanceRate: 95
        },
        rating: {
            averageRating: 4.8,
            totalReviews: 120
        },
        disciplinaryActionsCount: 0
    },
    {
        fullName: "Adv. Sneha Reddy",
        email: "sneha.reddy@example.com",
        barRegistrationNumber: "BR/54321/2015",
        verifiedBarStatus: true,
        activeStatus: true,
        yearsOfExperience: 8,
        primaryPracticeArea: "family",
        secondaryPracticeAreas: ["civil", "criminal"],
        location: {
            city: "Hyderabad",
            district: "Secunderabad",
            state: "Telangana",
            coordinates: {
                type: "Point",
                coordinates: [78.5000, 17.4500]
            }
        },
        caseStats: {
            totalCasesHandled: 120,
            successRate: 78,
            recentCasesLast6Months: 8
        },
        categoryStats: {
            criminal: { successRate: 70, casesHandled: 30 },
            family: { successRate: 85, casesHandled: 80 }
        },
        responsiveness: {
            avgResponseTimeMinutes: 30,
            acceptanceRate: 88
        },
        rating: {
            averageRating: 4.5,
            totalReviews: 45
        },
        disciplinaryActionsCount: 0
    },
    {
        fullName: "Adv. Vikram Singh",
        email: "vikram.singh@example.com",
        barRegistrationNumber: "BR/99887/2005",
        verifiedBarStatus: true,
        activeStatus: true,
        yearsOfExperience: 18,
        primaryPracticeArea: "criminal",
        secondaryPracticeAreas: ["corporate", "civil"],
        location: {
            city: "Hyderabad",
            district: "Banjara Hills",
            state: "Telangana",
            coordinates: {
                type: "Point",
                coordinates: [78.4320, 17.4120]
            }
        },
        caseStats: {
            totalCasesHandled: 600,
            successRate: 92,
            recentCasesLast6Months: 15
        },
        categoryStats: {
            criminal: { successRate: 94, casesHandled: 400 },
            family: { successRate: 80, casesHandled: 20 }
        },
        responsiveness: {
            avgResponseTimeMinutes: 10,
            acceptanceRate: 98
        },
        rating: {
            averageRating: 4.9,
            totalReviews: 200
        },
        disciplinaryActionsCount: 0
    },
    {
        fullName: "Adv. Priya Sharma",
        email: "priya.sharma@example.com",
        barRegistrationNumber: "BR/11223/2018",
        verifiedBarStatus: true,
        activeStatus: true,
        yearsOfExperience: 5,
        primaryPracticeArea: "civil",
        secondaryPracticeAreas: ["family"],
        location: {
            city: "Hyderabad",
            district: "Madhapur",
            state: "Telangana",
            coordinates: {
                type: "Point",
                coordinates: [78.3800, 17.4400]
            }
        },
        caseStats: {
            totalCasesHandled: 45,
            successRate: 72,
            recentCasesLast6Months: 10
        },
        categoryStats: {
            criminal: { successRate: 0, casesHandled: 0 },
            family: { successRate: 75, casesHandled: 20 }
        },
        responsiveness: {
            avgResponseTimeMinutes: 20,
            acceptanceRate: 92
        },
        rating: {
            averageRating: 4.2,
            totalReviews: 15
        },
        disciplinaryActionsCount: 0
    },
    {
        fullName: "Adv. Abdul Khan",
        email: "abdul.khan@example.com",
        barRegistrationNumber: "BR/33445/2012",
        verifiedBarStatus: true,
        activeStatus: true,
        yearsOfExperience: 12,
        primaryPracticeArea: "criminal",
        secondaryPracticeAreas: ["property"],
        location: {
            city: "Hyderabad",
            district: "Old City",
            state: "Telangana",
            coordinates: {
                type: "Point",
                coordinates: [78.4744, 17.3616]
            }
        },
        caseStats: {
            totalCasesHandled: 280,
            successRate: 82,
            recentCasesLast6Months: 5
        },
        categoryStats: {
            criminal: { successRate: 85, casesHandled: 200 },
            family: { successRate: 60, casesHandled: 10 }
        },
        responsiveness: {
            avgResponseTimeMinutes: 45,
            acceptanceRate: 80
        },
        rating: {
            averageRating: 4.6,
            totalReviews: 85
        },
        disciplinaryActionsCount: 0
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing lawyers if any or just add new ones
        // For safety in this environment, we'll use upsert based on barRegistrationNumber

        for (const lawyerData of defaultLawyers) {
            await Lawyer.findOneAndUpdate(
                { barRegistrationNumber: lawyerData.barRegistrationNumber },
                lawyerData,
                { upsert: true, new: true }
            );
        }

        console.log('✅ Successfully seeded 5 lawyers!');
        process.exit();
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seedDB();
