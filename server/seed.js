const mongoose = require('mongoose');
require('dotenv').config();

const Lawyer = require('./models/Lawyer');

async function seedLawyers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing lawyers
        await Lawyer.deleteMany({});
        console.log('🗑️ Cleared existing lawyers');

        // Data arrays for random generation
        const firstNames = ['Priya', 'Rajesh', 'Anita', 'Vikram', 'Meera', 'Suresh', 'Kavita', 'Amit', 'Deepika', 'Sanjay', 
                          'Neha', 'Arun', 'Pooja', 'Rahul', 'Sneha', 'Karthik', 'Divya', 'Manish', 'Aarti', 'Rohit',
                          'Swati', 'Nikhil', 'Ritu', 'Gaurav', 'Nandini'];
        const lastNames = ['Sharma', 'Kumar', 'Desai', 'Singh', 'Patel', 'Reddy', 'Joshi', 'Verma', 'Gupta', 'Rao',
                          'Iyer', 'Nair', 'Mehta', 'Shah', 'Bose', 'Das', 'Choudhury', 'Malhotra', 'Kapoor', 'Agarwal',
                          'Pandey', 'Mishra', 'Saxena', 'Banerjee', 'Chatterjee'];
        
        const practiceAreas = [
            'Criminal Law', 'Family Law', 'Property Law', 'Corporate Law', 'Labour Law',
            'Consumer Law', 'Intellectual Property', 'Tax Law', 'Civil Litigation', 'Constitutional Law',
            'Cyber Law', 'Environmental Law', 'Immigration Law', 'Banking Law', 'Insurance Law'
        ];

        const cities = [
            { city: 'Hyderabad', state: 'Telangana', baseLng: 78.4867, baseLat: 17.3850 },
            { city: 'Secunderabad', state: 'Telangana', baseLng: 78.5018, baseLat: 17.4399 },
            { city: 'Madhapur', state: 'Telangana', baseLng: 78.3915, baseLat: 17.4486 },
            { city: 'Gachibowli', state: 'Telangana', baseLng: 78.3498, baseLat: 17.4401 },
            { city: 'Banjara Hills', state: 'Telangana', baseLng: 78.4340, baseLat: 17.4156 }
        ];

        const expertiseMap = {
            'Criminal Law': ['Criminal Defense', 'Bail Applications', 'White Collar Crime', 'Cyber Crime', 'Murder Defense', 'Fraud Cases'],
            'Family Law': ['Divorce', 'Child Custody', 'Alimony', 'Domestic Violence', 'Adoption', 'Prenuptial Agreements'],
            'Property Law': ['Property Disputes', 'Real Estate', 'Title Verification', 'RERA', 'Land Acquisition', 'Tenancy'],
            'Corporate Law': ['M&A', 'Company Formation', 'Contract Law', 'Due Diligence', 'Startup Advisory', 'Compliance'],
            'Labour Law': ['Employment Disputes', 'Wrongful Termination', 'POSH', 'PF/ESI', 'Union Matters', 'Workplace Safety'],
            'Consumer Law': ['Consumer Complaints', 'Product Liability', 'E-commerce Disputes', 'Banking Issues', 'Service Deficiency'],
            'Intellectual Property': ['Patents', 'Trademarks', 'Copyright', 'IP Litigation', 'Trade Secrets', 'Licensing'],
            'Tax Law': ['Income Tax', 'GST', 'Tax Planning', 'Tax Appeals', 'International Tax', 'Transfer Pricing'],
            'Civil Litigation': ['Contract Disputes', 'Recovery Suits', 'Injunctions', 'Arbitration', 'Mediation'],
            'Constitutional Law': ['Fundamental Rights', 'PIL', 'Writ Petitions', 'Constitutional Remedies'],
            'Cyber Law': ['Data Privacy', 'Cyber Crime', 'IT Act Cases', 'Online Fraud', 'Social Media Issues'],
            'Environmental Law': ['Pollution Control', 'NGT Matters', 'Environmental Clearance', 'Wildlife Protection'],
            'Immigration Law': ['Visa Issues', 'Work Permits', 'Citizenship', 'Deportation Defense', 'NRI Matters'],
            'Banking Law': ['Loan Recovery', 'SARFAESI', 'DRT Matters', 'Banking Fraud', 'NBFC Regulations'],
            'Insurance Law': ['Claim Disputes', 'Policy Interpretation', 'Regulatory Compliance', 'Reinsurance']
        };

        const bios = [
            'Distinguished advocate with extensive courtroom experience and a track record of successful case resolutions.',
            'Senior counsel known for meticulous case preparation and client-focused legal strategies.',
            'Experienced legal professional combining traditional advocacy with modern legal tech approaches.',
            'Renowned for handling complex litigation with precision and dedication to client interests.',
            'Award-winning advocate with expertise in both trial and appellate practice.',
            'Trusted legal advisor to numerous corporations and high-net-worth individuals.',
            'Dynamic lawyer known for innovative legal solutions and exceptional client service.',
            'Seasoned practitioner with deep expertise in specialized legal domains.',
            'Highly rated advocate with consistent success in challenging legal matters.',
            'Dedicated legal professional committed to justice and ethical practice.'
        ];

        // Generate 25 lawyers
        const mockLawyers = [];
        
        for (let i = 0; i < 25; i++) {
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            const fullName = `Adv. ${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@lawfirm.com`;
            
            const practiceArea = practiceAreas[i % practiceAreas.length];
            const cityData = cities[i % cities.length];
            
            // Random offsets for coordinates (within ~10km)
            const lngOffset = (Math.random() - 0.5) * 0.15;
            const latOffset = (Math.random() - 0.5) * 0.15;
            
            const yearsExp = 3 + Math.floor(Math.random() * 20); // 3-22 years
            const avgRating = (4.0 + Math.random() * 0.9).toFixed(1); // 4.0-4.9
            const totalReviews = 20 + Math.floor(Math.random() * 250); // 20-269 reviews
            const successRate = 70 + Math.floor(Math.random() * 25); // 70-94%
            const hourlyRate = 1000 + Math.floor(Math.random() * 4000); // 1000-5000
            
            const expertise = expertiseMap[practiceArea] || ['General Practice'];
            const selectedExpertise = expertise.slice(0, 3 + Math.floor(Math.random() * 3));

            mockLawyers.push({
                fullName,
                email,
                barRegistrationNumber: `ts/${2005 + Math.floor(Math.random() * 18)}/${1000 + i}`,
                verifiedBarStatus: Math.random() > 0.2, // 80% verified
                activeStatus: true,
                yearsOfExperience: yearsExp,
                primaryPracticeArea: practiceArea,
                secondaryPracticeAreas: [practiceAreas[(i + 3) % practiceAreas.length], practiceAreas[(i + 7) % practiceAreas.length]],
                location: {
                    city: cityData.city,
                    district: 'Hyderabad',
                    state: cityData.state,
                    coordinates: {
                        type: 'Point',
                        coordinates: [cityData.baseLng + lngOffset, cityData.baseLat + latOffset]
                    }
                },
                caseStats: {
                    totalCasesHandled: 50 + Math.floor(Math.random() * 500),
                    successRate: successRate,
                    recentCasesLast6Months: 2 + Math.floor(Math.random() * 15)
                },
                categoryStats: {
                    [practiceArea.toLowerCase().replace(' ', '_')]: {
                        successRate: successRate,
                        casesHandled: 30 + Math.floor(Math.random() * 200)
                    }
                },
                responsiveness: {
                    avgResponseTimeMinutes: 10 + Math.floor(Math.random() * 50),
                    acceptanceRate: 70 + Math.floor(Math.random() * 25)
                },
                rating: {
                    averageRating: parseFloat(avgRating),
                    totalReviews: totalReviews
                },
                disciplinaryActionsCount: Math.random() > 0.95 ? 1 : 0, // 5% have 1 action
                // Legacy/Extra fields for UI
                avatar: `${firstName[0]}${lastName[0]}`,
                bio: bios[i % bios.length],
                expertise: selectedExpertise,
                hourlyRate: hourlyRate,
                available: true
            });
        }

        // Insert all lawyers
        const result = await Lawyer.insertMany(mockLawyers);
        
        console.log(`\n✅ Successfully seeded ${result.length} lawyers!\n`);
        
        // Print summary
        console.log('📊 SUMMARY:');
        console.log('─'.repeat(50));
        
        const areas = [...new Set(mockLawyers.map(l => l.primaryPracticeArea))];
        console.log(`Practice Areas: ${areas.length}`);
        areas.forEach(area => {
            const count = mockLawyers.filter(l => l.primaryPracticeArea === area).length;
            console.log(`  • ${area}: ${count} lawyers`);
        });
        
        console.log('\n📍 Cities:');
        const cityList = [...new Set(mockLawyers.map(l => l.location.city))];
        cityList.forEach(city => {
            const count = mockLawyers.filter(l => l.location.city === city).length;
            console.log(`  • ${city}: ${count} lawyers`);
        });

        console.log('\n👨‍⚖️ Sample Lawyers:');
        mockLawyers.slice(0, 5).forEach((l, i) => {
            console.log(`  ${i+1}. ${l.fullName} - ${l.primaryPracticeArea} (${l.yearsOfExperience} yrs, ⭐${l.rating.averageRating})`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Done! Database connection closed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding:', error);
        process.exit(1);
    }
}

seedLawyers();
