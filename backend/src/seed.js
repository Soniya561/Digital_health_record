require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const HealthRecord = require('./models/HealthRecord');
const Scheme = require('./models/Scheme');
const { connectDB } = require('./config/db');

async function seed() {
  await connectDB();
  
  // Clear existing data
  await Patient.deleteMany({});
  await HealthRecord.deleteMany({});
  await Scheme.deleteMany({});
  
  console.log('Cleared existing data');

  // Create demo patient
  const patient = new Patient({
    name: 'John Doe',
    email: 'patient@demo.com',
    password: 'password123',
    role: 'PATIENT',
    phone: '9876543210'
  });
  await patient.save();
  console.log('Created demo patient');

  // Create demo schemes
  const schemes = [
    {
      name: 'Karunya Benevolent Fund',
      description: 'Financial assistance for treatment of serious ailments',
      benefits: ['Up to ₹5 lakh assistance', 'Coverage for critical illnesses', 'Fast-track processing'],
      eligibilityCriteria: {
        isBPLRequired: true,
        incomeLimit: 300000
      }
    },
    {
      name: 'Kerala State Health Insurance',
      description: 'Comprehensive health insurance for workers',
      benefits: ['₹5 lakh annual coverage', 'Cashless treatment', 'Pre and post hospitalization'],
      eligibilityCriteria: {
        employmentType: 'Migrant Worker'
      }
    },
    {
      name: 'Diabetes Management Program',
      description: 'Free medication and monitoring for diabetes patients',
      benefits: ['Free monthly medication', 'Quarterly health checkups', 'Diet counseling'],
      eligibilityCriteria: {
        requiredConditions: ['Diabetes']
      }
    },
    {
      name: 'Ayushman Bharat - PMJAY',
      description: 'National health protection scheme',
      benefits: ['₹5 lakh per family per year', '1,500+ medical procedures', 'All public and empaneled hospitals'],
      eligibilityCriteria: {
        isBPLRequired: true
      }
    }
  ];

  for (const s of schemes) {
    const scheme = new Scheme(s);
    await scheme.save();
  }
  console.log('Created demo schemes');

  // Create demo doctor
  const doctor = new Patient({
    name: 'Dr. Smith',
    email: 'doctor@demo.com',
    password: 'password123',
    role: 'DOCTOR',
    phone: '9876543211'
  });
  await doctor.save();
  console.log('Created demo doctor');

  // Create demo admin
  const admin = new Patient({
    name: 'System Admin',
    email: 'soniyavinoth07@gmail.com',
    password: 'password123',
    role: 'ADMIN',
    phone: '9876543212'
  });
  await admin.save();
  console.log('Created demo admin');

  // Create some records for the patient
  const records = [
    {
      patient: patient._id,
      title: 'General Checkup & Medication',
      description: 'Annual physical examination',
      category: 'prescription',
      hospital: 'Medical College Hospital, Trivandrum',
      doctor: 'Dr. Priya Menon',
      createdBy: doctor._id,
      createdByRole: 'DOCTOR',
      fileUrl: 'prescription_dummy.pdf'
    },
    {
      patient: patient._id,
      title: 'Blood Test - Complete Blood Count',
      description: 'Routine blood work',
      category: 'lab',
      hospital: 'District Hospital, Ernakulam',
      doctor: 'Dr. Suresh Kumar',
      createdBy: doctor._id,
      createdByRole: 'DOCTOR',
      fileUrl: 'lab_dummy.pdf'
    }
  ];

  for (const recData of records) {
    const rec = new HealthRecord(recData);
    await rec.save();
  }
  
  console.log('Created demo records');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
