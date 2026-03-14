const { OpenAI } = require('openai');
const Scheme = require('../models/Scheme');
const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');
const Appointment = require('../models/Appointment');

// Initialize OpenAI client for Groq or Gemini (using OpenAI compatibility)
let openai = null;
if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'replace_with_your_api_key') {
  openai = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1', // Default to Groq if not specified
  });
} else {
  console.warn('AI_API_KEY not set. AI features will be unavailable.');
}

function extractJsonObject(text = '') {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text);
  } catch (_) {
    // Try to parse object wrapped in markdown or extra prose
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (_) {
    return null;
  }
}

function normalizeClinicalOutput(parsed, context) {
  const fallbackNotes = `Patient: ${context.patient.name || 'Unknown'} | Age: ${context.patient.age || 'Unknown'} | Gender: ${context.patient.gender || 'Unknown'}.
Primary review based on appointment (${context.appointment.specialty || 'General'}) and available records.
Relevant chronic conditions: ${(context.patient.chronicConditions || []).join(', ') || 'None documented'}.
Known allergies: ${(context.patient.allergies || []).join(', ') || 'None documented'}.
Clinical impression: requires physician confirmation with physical exam and current vitals.`;

  const fallbackPrescriptions = [
    {
      medicine: 'Paracetamol',
      dosage: '500 mg',
      duration: '3 days',
      instructions: 'Use only if fever/pain is present. Max 3 g/day.'
    }
  ];

  const clinicalNotes = (parsed && typeof parsed.clinicalNotes === 'string' && parsed.clinicalNotes.trim())
    ? parsed.clinicalNotes.trim()
    : fallbackNotes;

  const prescriptions = Array.isArray(parsed?.prescriptions)
    ? parsed.prescriptions
        .map((p) => ({
          medicine: (p?.medicine || '').toString().trim(),
          dosage: (p?.dosage || '').toString().trim(),
          duration: (p?.duration || '').toString().trim(),
          instructions: (p?.instructions || '').toString().trim()
        }))
        .filter((p) => p.medicine || p.dosage || p.duration || p.instructions)
    : [];

  return {
    clinicalNotes,
    prescriptions: prescriptions.length ? prescriptions : fallbackPrescriptions
  };
}

const generateSchemeRecommendations = async (patient, language = 'en') => {
  const schemes = await Scheme.find({});
  const records = await HealthRecord.find({ patient: patient._id });
  
  const patientData = {
    name: patient.name,
    dob: patient.dob,
    gender: patient.gender,
    income: patient.income,
    isBPL: patient.isBPL,
    isMigrant: patient.isMigrant,
    chronicConditions: patient.chronicConditions,
    disabilities: patient.disabilities,
    employmentType: patient.employmentType,
    healthHistory: records.map(r => ({
      title: r.title,
      description: r.description,
      category: r.category
    }))
  };

  const schemeData = schemes.map(s => ({
    id: s._id,
    name: s.name,
    description: s.description,
    eligibility: s.eligibilityCriteria,
    benefits: s.benefits
  }));

  const prompt = `Based on the following patient data and their health history, suggest which health schemes they might be eligible for and explain why.
  
  Patient Data & Health History:
  ${JSON.stringify(patientData, null, 2)}
  
  Available Schemes:
  ${JSON.stringify(schemeData, null, 2)}
  
  Please provide a concise recommendation for each scheme that the patient might be eligible for. 
  If they are definitely not eligible for a scheme, explain why based on the criteria. 
  Mention specific health conditions found in their history that match the scheme criteria.
  Return the response as a clear, structured summary with bullet points.
  IMPORTANT: The entire response MUST be in the following language: ${language}.`;

  if (!openai) {
    return "AI recommendations are currently unavailable. Please check back later or contact support.";
  }

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: `You are an expert in health insurance and government health schemes in Kerala, India. You MUST respond in ${language}.` },
      { role: 'user', content: prompt }
    ],
  });

  return response.choices[0].message.content;
};

exports.generateSchemeRecommendations = generateSchemeRecommendations;

exports.askAI = async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const messages = [
      { role: 'system', content: `You are a helpful AI assistant for a Digital Health Record application. You process data but do not learn or maintain history. You MUST respond in ${language}.` },
      { role: 'user', content: message }
    ];

    if (!openai) {
      return res.status(503).json({ message: 'AI service is currently unavailable' });
    }

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
    });

    res.json({
      answer: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ message: 'Error connecting to AI service' });
  }
};

exports.getAiSchemeRecommendations = async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const patient = await Patient.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const recommendations = await generateSchemeRecommendations(patient, language);

    res.json({ recommendations });
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({ message: 'Error generating AI recommendations' });
  }
};

exports.chatAboutSchemes = async (req, res) => {
  try {
    const { message, history, language = 'en' } = req.body;
    const patient = await Patient.findById(req.user.id);
    const schemes = await Scheme.find({});
    const records = await HealthRecord.find({ patient: patient._id });

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientData = {
      name: patient.name,
      dob: patient.dob,
      gender: patient.gender,
      income: patient.income,
      isBPL: patient.isBPL,
      isMigrant: patient.isMigrant,
      chronicConditions: patient.chronicConditions,
      disabilities: patient.disabilities,
      employmentType: patient.employmentType,
      healthHistory: records.map(r => ({
        title: r.title,
        description: r.description,
        category: r.category
      }))
    };

    const schemeData = schemes.map(s => ({
      name: s.name,
      description: s.description,
      eligibility: s.eligibilityCriteria,
      benefits: s.benefits
    }));

    const systemPrompt = `You are a static AI assistant for government health schemes in Kerala, India. 
    You provide information based solely on the provided patient profile and available schemes.
    Answer the patient's questions about schemes based on this static data. Do not learn or assume details outside this context.
    
    Patient Profile & Health History:
    ${JSON.stringify(patientData, null, 2)}
    
    Available Schemes:
    ${JSON.stringify(schemeData, null, 2)}
    
    IMPORTANT: You MUST respond in the following language: ${language}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
      { role: 'user', content: message }
    ];

    if (!openai) {
      return res.status(503).json({ message: 'AI service is currently unavailable' });
    }

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages,
    });

    res.json({
      answer: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('Scheme AI Chat Error:', error);
    res.status(500).json({ message: 'Error connecting to AI service' });
  }
};

exports.getHealthInsights = async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const patient = await Patient.findById(req.user.id);
    const records = await HealthRecord.find({ patient: req.user.id });

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientData = {
      name: patient.name,
      age: patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'Unknown',
      gender: patient.gender,
      chronicConditions: patient.chronicConditions,
      healthHistory: records.map(r => ({
        title: r.title,
        description: r.description,
        category: r.category,
        date: r.createdAt
      }))
    };

    const prompt = `Analyze the following patient's health data and history to provide 3 concise, actionable health insights.
    
    Patient Profile:
    ${JSON.stringify(patientData, null, 2)}
    
    Requirements:
    - Return exactly 3 insights.
    - Each insight must have a short title, a message, and a type (one of: "success", "warning", "info").
    - Format as a JSON array of objects with keys: title, message, type.
    - Be specific to the patient's data (e.g., if they have diabetes, mention it).
    - Use clear, professional, and empathetic language.
    - IMPORTANT: The language of all values in the JSON (title and message) MUST be in: ${language}.
    
    Example format:
    [
      {"title": "insight title", "message": "insight message", "type": "success"},
      ...
    ]`;

    if (!openai) {
      return res.json({ insights: [] });
    }

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a medical AI assistant providing personalized health insights. You MUST respond in ${language}.` },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    let insights;
    try {
      const parsed = JSON.parse(response.choices[0].message.content);
      insights = Array.isArray(parsed) ? parsed : (parsed.insights || []);
    } catch (e) {
      console.error('Failed to parse AI response as JSON', e);
      insights = [];
    }

    res.json({ insights });
  } catch (error) {
    console.error('Health Insights Error:', error);
    res.status(500).json({ message: 'Error generating health insights' });
  }
};

exports.generateClinicalNotes = async (req, res) => {
  try {
    const { appointmentId, language = 'en' } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'Appointment ID is required' });

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const patient = appointment.patient ? await Patient.findById(appointment.patient) : null;
    const records = patient
      ? await HealthRecord.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(5)
      : [];

    const context = {
      patient: {
        name: patient?.name || 'Unknown Patient',
        age: patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'Unknown',
        gender: patient?.gender || 'Unknown',
        chronicConditions: patient?.chronicConditions || [],
        allergies: patient?.allergies || [],
        bloodGroup: patient?.bloodGroup || 'Unknown'
      },
      appointment: {
        specialty: appointment.specialty,
        type: appointment.type,
        date: appointment.date
      },
      recentRecords: records.map(r => ({
        title: r.title,
        description: r.description,
        category: r.category,
        date: r.createdAt
      }))
    };

    const prompt = `As a static clinical data processor, generate professional clinical notes and suggested prescriptions for the following appointment based ONLY on the provided context. Do not use outside knowledge or learn from this interaction.
    
    Context:
    ${JSON.stringify(context, null, 2)}
    
    Requirements:
    - Provide a concise clinical summary.
    - Suggest potential diagnoses based on history.
    - Recommend 2-3 specific medications (if applicable) with dosage and instructions.
    - Format as a JSON object with: 
      - "clinicalNotes": (string)
      - "prescriptions": (array of objects with keys: medicine, dosage, duration, instructions)
    - Use professional medical terminology.
    - Be concise and accurate based on the provided static data.
    - Return ONLY valid JSON with no markdown and no extra commentary.
    - IMPORTANT: The language for "clinicalNotes" and "instructions" in prescriptions MUST be: ${language}.
    `;

    if (!openai) {
      const fallback = normalizeClinicalOutput(null, context);
      return res.json({
        ...fallback,
        generatedBy: 'fallback',
        warning: 'AI service unavailable. Generated a safe fallback draft.'
      });
    }

    try {
      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `You are a static clinical assistant AI that processes provided data and does not learn or maintain state. You MUST respond in ${language}.` },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const raw = response?.choices?.[0]?.message?.content || '';
      const parsed = extractJsonObject(raw);
      const result = normalizeClinicalOutput(parsed, context);
      return res.json({ ...result, generatedBy: 'ai' });
    } catch (aiError) {
      console.error('Clinical Notes AI provider error:', aiError);
      const fallback = normalizeClinicalOutput(null, context);
      return res.json({
        ...fallback,
        generatedBy: 'fallback',
        warning: 'AI service unavailable. Generated a safe fallback draft.'
      });
    }
  } catch (error) {
    console.error('Clinical Notes Generation Error:', error);
    res.status(500).json({ message: 'Error generating clinical notes', error: error.message });
  }
};

exports.clinicalChat = async (req, res) => {
  try {
    const { messages, patientId, appointmentId, language = 'en' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    let contextData = {};
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId).populate('patient');
      if (appointment) {
        const records = await HealthRecord.find({ patient: appointment.patient?._id }).sort({ createdAt: -1 }).limit(5);
        contextData = {
          patient: appointment.patient,
          appointment: {
            specialty: appointment.specialty,
            type: appointment.type,
            date: appointment.date
          },
          recentRecords: records.map(r => ({
            title: r.title,
            description: r.description,
            category: r.category,
            date: r.createdAt
          }))
        };
      }
    } else if (patientId) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        const records = await HealthRecord.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(5);
        contextData = {
          patient,
          recentRecords: records.map(r => ({
            title: r.title,
            description: r.description,
            category: r.category,
            date: r.createdAt
          }))
        };
      }
    }

    const systemPrompt = `You are a professional Clinical AI Assistant for doctors in a Digital Health Record application. 
    You provide clinical decision support, summarize patient history, and help with medical queries.
    Always maintain a professional, clinical tone.
    Your answers should be evidence-based and concise.
    IMPORTANT: You MUST respond in the following language: ${language}.
    ${Object.keys(contextData).length > 0 ? `\n\nContext for current clinical case:\n${JSON.stringify(contextData, null, 2)}` : ''}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    if (!openai) {
      return res.status(503).json({ message: 'AI service is currently unavailable' });
    }

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: apiMessages,
    });

    res.json({
      answer: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('Clinical Chat Error:', error);
    res.status(500).json({ message: 'Error connecting to AI service' });
  }
};
