/**
 * P2Care Demo Seed Script
 * Seeds the database with hospital, admin, doctors, departments, and dummy patients.
 * Safe to run multiple times (idempotent via ON CONFLICT).
 */
import pool from './dbConnection.js';

const HOSPITAL_ID = process.env.DEFAULT_HOSPITAL_ID || '8be57ccb-cf9b-4bd3-b624-2493b0dac0b6';

async function seedDemoData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 P2Care Demo Seed — starting...');

        // 0. Ensure pgcrypto
        await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

        // 1. Hospital
        await client.query(`
            INSERT INTO hospitals (id, name, state_code)
            VALUES ($1, 'P2Care Apex Central Hospital', 'DL')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, state_code = EXCLUDED.state_code
        `, [HOSPITAL_ID]);
        console.log('✅ Hospital inserted');

        // 2. Admin
        await client.query(`
            INSERT INTO users (hospital_id, name, email, password_hash, role, specialization, is_active)
            VALUES ($1, 'Hospital Administrator', 'admin@ayushcare.com',
                    crypt('Admin@123', gen_salt('bf', 10)), 'hospital_admin', 'Administration', TRUE)
            ON CONFLICT (email) DO NOTHING
        `, [HOSPITAL_ID]);
        console.log('✅ Admin user inserted');

        // 3. Departments
        const departments = [
            ['General Medicine', 'allopathy'],
            ['Cardiology', 'allopathy'],
            ['Orthopaedics', 'allopathy'],
            ['Pediatrics', 'allopathy'],
            ['Dermatology', 'allopathy'],
            ['Pulmonology', 'allopathy'],
            ['ENT', 'allopathy'],
            ['Kayachikitsa', 'ayurveda'],
            ['Panchakarma', 'ayurveda'],
            ['Shalya Tantra', 'ayurveda'],
        ];
        for (const [name, pathway] of departments) {
            await client.query(`
                INSERT INTO departments (hospital_id, name, pathway, is_active)
                VALUES ($1, $2, $3, TRUE)
                ON CONFLICT (hospital_id, name) DO UPDATE SET pathway = EXCLUDED.pathway, is_active = EXCLUDED.is_active
            `, [HOSPITAL_ID, name, pathway]);
        }
        console.log('✅ 10 departments inserted');

        // 4. Doctors
        const doctors = [
            // General Medicine
            ['Dr. Rajesh Sharma', 'dr.rajesh.sharma@ayushcare.com', 'General Medicine'],
            ['Dr. Priya Nair', 'dr.priya.nair@ayushcare.com', 'General Medicine'],
            ['Dr. Amit Verma', 'dr.amit.verma@ayushcare.com', 'General Medicine'],
            ['Dr. Sunita Rao', 'dr.sunita.rao@ayushcare.com', 'General Medicine'],
            ['Dr. Vikram Malhotra', 'dr.vikram.malhotra@ayushcare.com', 'General Medicine'],
            // Cardiology
            ['Dr. Ananya Sen', 'dr.ananya.sen@ayushcare.com', 'Cardiology'],
            ['Dr. Rohit Mehta', 'dr.rohit.mehta@ayushcare.com', 'Cardiology'],
            ['Dr. Neha Kapoor', 'dr.neha.kapoor@ayushcare.com', 'Cardiology'],
            ['Dr. Sanjay Gupta', 'dr.sanjay.gupta@ayushcare.com', 'Cardiology'],
            ['Dr. Pooja Joshi', 'dr.pooja.joshi@ayushcare.com', 'Cardiology'],
            // Orthopaedics
            ['Dr. Arvind Kumar', 'dr.arvind.kumar@ayushcare.com', 'Orthopaedics'],
            ['Dr. Deepa Iyer', 'dr.deepa.iyer@ayushcare.com', 'Orthopaedics'],
            ['Dr. Manoj Tiwari', 'dr.manoj.tiwari@ayushcare.com', 'Orthopaedics'],
            ['Dr. Kavita Desai', 'dr.kavita.desai@ayushcare.com', 'Orthopaedics'],
            ['Dr. Rakesh Singhania', 'dr.rakesh.singhania@ayushcare.com', 'Orthopaedics'],
            // Pediatrics
            ['Dr. Meera Nambiar', 'dr.meera.nambiar@ayushcare.com', 'Pediatrics'],
            ['Dr. Kunal Shah', 'dr.kunal.shah@ayushcare.com', 'Pediatrics'],
            ['Dr. Sneha Patil', 'dr.sneha.patil@ayushcare.com', 'Pediatrics'],
            ['Dr. Tarun Saxena', 'dr.tarun.saxena@ayushcare.com', 'Pediatrics'],
            ['Dr. Divya Pillai', 'dr.divya.pillai@ayushcare.com', 'Pediatrics'],
            // Dermatology
            ['Dr. Alok Bhattacharya', 'dr.alok.b@ayushcare.com', 'Dermatology'],
            ['Dr. Swati Agarwal', 'dr.swati.agarwal@ayushcare.com', 'Dermatology'],
            ['Dr. Rohan Kulkarni', 'dr.rohan.kulkarni@ayushcare.com', 'Dermatology'],
            ['Dr. Preeti Reddy', 'dr.preeti.reddy@ayushcare.com', 'Dermatology'],
            ['Dr. Mohit Chawla', 'dr.mohit.chawla@ayushcare.com', 'Dermatology'],
            // Pulmonology
            ['Dr. Harish Chandra', 'dr.harish.chandra@ayushcare.com', 'Pulmonology'],
            ['Dr. Vandana Hegde', 'dr.vandana.hegde@ayushcare.com', 'Pulmonology'],
            ['Dr. Siddharth Jain', 'dr.siddharth.jain@ayushcare.com', 'Pulmonology'],
            ['Dr. Ritu Choudhury', 'dr.ritu.choudhury@ayushcare.com', 'Pulmonology'],
            ['Dr. Gaurav Pandey', 'dr.gaurav.pandey@ayushcare.com', 'Pulmonology'],
            // ENT
            ['Dr. Suresh Menon', 'dr.suresh.menon@ayushcare.com', 'ENT'],
            ['Dr. Shweta Mishra', 'dr.shweta.mishra@ayushcare.com', 'ENT'],
            ['Dr. Varun Sethi', 'dr.varun.sethi@ayushcare.com', 'ENT'],
            ['Dr. Rashmi Bose', 'dr.rashmi.bose@ayushcare.com', 'ENT'],
            ['Dr. Nikhil Bansal', 'dr.nikhil.bansal@ayushcare.com', 'ENT'],
            // Kayachikitsa (Ayurveda)
            ['Dr. Vaidya Achyut Varma', 'dr.achyut.varma@ayushcare.com', 'Kayachikitsa'],
            ['Dr. Vaidya Gayatri Devi', 'dr.gayatri.devi@ayushcare.com', 'Kayachikitsa'],
            ['Dr. Vaidya Brijesh Tripathi', 'dr.brijesh.tripathi@ayushcare.com', 'Kayachikitsa'],
            // Panchakarma (Ayurveda)
            ['Dr. Vaidya Madhavan Nampoothiri', 'dr.madhavan.n@ayushcare.com', 'Panchakarma'],
            ['Dr. Vaidya Shailaja Joshi', 'dr.shailaja.joshi@ayushcare.com', 'Panchakarma'],
            ['Dr. Vaidya Raghavan Nair', 'dr.raghavan.nair@ayushcare.com', 'Panchakarma'],
            // Shalya Tantra (Ayurveda)
            ['Dr. Vaidya Devendra Shastri', 'dr.devendra.shastri@ayushcare.com', 'Shalya Tantra'],
            ['Dr. Vaidya Uma Bhatt', 'dr.uma.bhatt@ayushcare.com', 'Shalya Tantra'],
            ['Dr. Vaidya Hariprasad Sharma', 'dr.hariprasad.s@ayushcare.com', 'Shalya Tantra'],
        ];

        let doctorCount = 0;
        for (const [name, email, spec] of doctors) {
            const res = await client.query(`
                INSERT INTO users (hospital_id, name, email, password_hash, role, specialization, is_active)
                VALUES ($1, $2, $3, crypt('Doctor@123', gen_salt('bf', 10)), 'doctor', $4, TRUE)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [HOSPITAL_ID, name, email, spec]);
            if (res.rowCount > 0) doctorCount++;
        }
        console.log(`✅ ${doctorCount} new doctors inserted (${doctors.length} total attempted)`);

        // 5. Map doctors to departments
        const mapResult = await client.query(`
            INSERT INTO doctor_departments (doctor_id, department_id)
            SELECT u.id, d.id
            FROM users u
            JOIN departments d ON d.hospital_id = u.hospital_id AND d.name = u.specialization
            WHERE u.role = 'doctor' AND u.hospital_id = $1
            ON CONFLICT (doctor_id, department_id) DO NOTHING
        `, [HOSPITAL_ID]);
        console.log(`✅ ${mapResult.rowCount} doctor-department mappings created`);

        // 6. Dummy patients
        const patients = [
            ['14-1111-2222-3333', 'ramesh.kumar@abdm', 'Ramesh Kumar', 'Male', '1985-06-15', '9876543210', 'Sector 14, Rohini, New Delhi', '554433221100'],
            ['14-2222-3333-4444', 'sunita.devi@abdm', 'Sunita Devi', 'Female', '1992-11-04', '9876543211', 'Pocket B, Mayur Vihar, New Delhi', '665544332211'],
            ['14-3333-4444-5555', 'arjun.singh@abdm', 'Arjun Singh', 'Male', '1978-02-28', '9876543212', 'Block C, Janakpuri, New Delhi', '776655443322'],
            ['14-4444-5555-6666', 'kavita.sharma@abdm', 'Kavita Sharma', 'Female', '2001-09-19', '9876543213', 'Model Town, Delhi', '887766554433'],
            ['14-5555-6666-7777', 'mohd.tariq@abdm', 'Mohammad Tariq', 'Male', '1990-12-10', '9876543214', 'Daryaganj, Old Delhi', '998877665544'],
        ];

        let patientCount = 0;
        for (const [abha, abhaAddr, name, gender, dob, mobile, address, aadhaar] of patients) {
            const res = await client.query(`
                INSERT INTO patients (abha_number, abha_address, full_name, gender, date_of_birth,
                    mobile_number, address, aadhaar_number, registration_type, consent_granted)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', TRUE)
                ON CONFLICT (abha_number) DO NOTHING
                RETURNING id
            `, [abha, abhaAddr, name, gender, dob, mobile, address, aadhaar]);
            if (res.rowCount > 0) patientCount++;
        }
        console.log(`✅ ${patientCount} new patients inserted`);

        // 7. Default privacy settings
        await client.query(`
            INSERT INTO privacy_settings (patient_id, isolate_past_history, consent_voice_processing,
                lock_diagnosis, lock_visits, lock_reports,
                share_previous_departments, share_previous_reports, share_previous_appointments)
            SELECT id, FALSE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE, TRUE
            FROM patients
            ON CONFLICT (patient_id) DO NOTHING
        `);
        console.log('✅ Privacy settings set');

        await client.query('COMMIT');

        // Verification
        const verify = await client.query(`
            SELECT
                (SELECT count(*) FROM hospitals) AS hospitals,
                (SELECT count(*) FROM departments WHERE pathway = 'allopathy') AS allopathy_depts,
                (SELECT count(*) FROM departments WHERE pathway = 'ayurveda') AS ayurveda_depts,
                (SELECT count(*) FROM users WHERE role = 'doctor') AS doctors,
                (SELECT count(*) FROM users WHERE role = 'hospital_admin') AS admins,
                (SELECT count(*) FROM doctor_departments) AS dept_mappings,
                (SELECT count(*) FROM patients) AS patients
        `);
        console.log('\n📊 Database verification:');
        console.table(verify.rows[0]);
        console.log('\n🎉 P2Care demo data seeded successfully!');
        console.log('\n📋 Demo Credentials:');
        console.log('   Admin:  admin@ayushcare.com / Admin@123');
        console.log('   Doctor: dr.rajesh.sharma@ayushcare.com / Doctor@123');
        console.log('   Patient ABHA: 14-1111-2222-3333 | Mobile: 9876543210');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedDemoData();
