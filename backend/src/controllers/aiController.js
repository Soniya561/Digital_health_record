const { OpenAI } = require('openai');
const Scheme = require('../models/Scheme');
const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');

// Initialize OpenAI client for Groq or Gemini (using OpenAI compatibility)
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1', // Default to Groq if not specified
});

const generateSchemeRecommendations = async (patient) => {
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
  Return the response as a clear, structured summary with bullet points.`;

  const response = await openai.chat.completions.create({
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are an expert in health insurance and government health schemes in Kerala, India.' },
      { role: 'user', content: prompt }
    ],
  });

  return response.choices[0].message.content;
};

exports.generateSchemeRecommendations = generateSchemeRecommendations;

exports.askAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant for a Digital Health Record application.' },
      ...(history || []),
      { role: 'user', content: message }
    ];

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
    const patient = await Patient.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const recommendations = await generateSchemeRecommendations(patient);

    res.json({ recommendations });
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({ message: 'Error generating AI recommendations' });
  }
};

exports.chatAboutSchemes = async (req, res) => {
  try {
    const { message, history } = req.body;
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

    const systemPrompt = `You are an expert AI assistant for government health schemes in Kerala, India. 
    You have access to the patient's profile, their health history, and the available schemes.
    
    Patient Profile & Health History:
    ${JSON.stringify(patientData, null, 2)}
    
    Available Schemes:
    ${JSON.stringify(schemeData, null, 2)}
    
    Answer the patient's questions about schemes based on their eligibility, health history, and these schemes. 
    Be helpful, clear, and empathetic. If they are not eligible for a scheme, explain why based on their profile and the specific criteria.
    If you find health conditions in their history that match a scheme, highlight that.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

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
    
    Example format:
    [
      {"title": "insight title", "message": "insight message", "type": "success"},
      ...
    ]`;

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a medical AI assistant providing personalized health insights.' },
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
