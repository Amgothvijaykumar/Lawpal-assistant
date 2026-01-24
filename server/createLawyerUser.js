const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Lawyer = require('./models/Lawyer');

async function createLawyerUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Lawyer login credentials
        const lawyerCredentials = {
            email: 'lawyer@actright.com',
            password: 'Lawyer123!',
            displayName: 'Adv. Priya Sharma'
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email: lawyerCredentials.email });
        if (existingUser) {
            console.log('⚠️ Lawyer user already exists');
            console.log('\n📋 LAWYER LOGIN CREDENTIALS:');
            console.log('================================');
            console.log(`Email: ${lawyerCredentials.email}`);
            console.log(`Password: ${lawyerCredentials.password}`);
            console.log('================================\n');
            await mongoose.disconnect();
            return;
        }

        // Create User with lawyer role
        const hashedPassword = await bcrypt.hash(lawyerCredentials.password, 10);
        const newUser = new User({
            email: lawyerCredentials.email,
            password: hashedPassword,
            displayName: lawyerCredentials.displayName,
            role: 'lawyer',
            profileCompleted: true,
            location: {
                city: 'Hyderabad',
                state: 'Telangana',
                district: 'Hyderabad',
                coordinates: {
                    type: 'Point',
                    coordinates: [78.4867, 17.3850]
                }
            }
        });

        await newUser.save();
        console.log('✅ Created lawyer user account');

        // Create/Update Lawyer profile linked to user
        const lawyerProfile = await Lawyer.findOneAndUpdate(
            { email: lawyerCredentials.email },
            {
                userId: newUser._id,
                fullName: lawyerCredentials.displayName,
                email: lawyerCredentials.email,
                barRegistrationNumber: 'BAR/TS/2012/12345',
                verifiedBarStatus: true,
                activeStatus: true,
                yearsOfExperience: 12,
                primaryPracticeArea: 'Family Law',
                secondaryPracticeAreas: ['Criminal Law', 'Property Law'],
                location: {
                    city: 'Hyderabad',
                    district: 'Hyderabad',
                    state: 'Telangana',
                    coordinates: {
                        type: 'Point',
                        coordinates: [78.4867, 17.3850]
                    }
                },
                caseStats: {
                    totalCasesHandled: 245,
                    successRate: 88,
                    recentCasesLast6Months: 18
                },
                responsiveness: {
                    avgResponseTimeMinutes: 30,
                    acceptanceRate: 92
                },
                rating: {
                    averageRating: 4.8,
                    totalReviews: 124
                }
            },
            { upsert: true, new: true }
        );

        console.log('✅ Created/Updated lawyer profile');
        console.log(`   Lawyer ID: ${lawyerProfile._id}`);

        console.log('\n📋 LAWYER LOGIN CREDENTIALS:');
        console.log('================================');
        console.log(`Email: ${lawyerCredentials.email}`);
        console.log(`Password: ${lawyerCredentials.password}`);
        console.log('================================\n');

        await mongoose.disconnect();
        console.log('✅ Done! Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createLawyerUser();
