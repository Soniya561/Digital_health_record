import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Globe, Heart } from 'lucide-react';
import { LanguageSelector } from '@/app/components/LanguageSelector';

interface LanguageSelectionScreenProps {
  onLanguageSelect: (language: string) => void;
}

const translations = {
  heading: [
    'Kerala Health Portal',
    'കേരള ഹെൽത്ത് പോർട്ടൽ',
    'கேரளா ஹெல்த் போர்டல்',
    'केरला हेल्थ पोर्टल',
    'কেরালা হেলথ পোর্টাল',
  ],
  title: [
    'Choose Your Language',
    'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    'உங்கள் மொழியை தேர்வு செய்க',
    'अपनी भाषा चुनें',
    'আপনার ভাষা নির্বাচন করুন',
  ],
  subtitle: [
    'Digital Health Records for Everyone',
    'അവർക്കുവേണ്ടി ഡിജിറ്റൽ ആരോഗ്യ റെക്കോർഡുകൾ',
    'அனைவருக்கும் டிஜிட்டல் சுகாதார பதிவுகள்',
    'सभी के लिए डिजिटल स्वास्थ्य रिकॉर्ड',
    'সবার জন্য ডিজিটাল স্বাস্থ্য রেকর্ড',
  ],
  footer: [
    'Powered by Government of Kerala',
    'കേരള സർക്കാർ നൽകുന്ന',
    'கேரள அரசு வழங்குகிறது',
    'केरल सरकार द्वारा समर्थित',
    'কেরল সরকার দ্বারা সমর্থিত',
  ],
  languageTagline: [
    'Available in 5 Languages',
    '5 ഭാഷകളിൽ ലഭ്യമാണ്',
    '5 மொழிகளில் கிடைக்கிறது',
    '5 भाषाओं में उपलब्ध',
    '5 ভাষায় উপলব্ধ',
  ],
  languageNames: [
    ['English', 'Malayalam', 'Tamil', 'Hindi', 'Bengali'],
    ['ഇംഗ്ലീഷ്', 'മലയാളം', 'தமிழ்', 'हिंदी', 'বাংলা'],
    ['இங்கிலீஷ்', 'மொழி', 'தமிழ்', 'हिंदी', 'বাংলা'],
    ['अंग्रेज़ी', 'मलयालम', 'तमिल', 'हिंदी', 'बंगाली'],
    ['ইংরেজি', 'মালয়ালম', 'তামিল', 'হিন্দি', 'বাংলা'],
  ],
};

export function LanguageSelectionScreen({ onLanguageSelect }: LanguageSelectionScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % translations.title.length);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const currentHeading = translations.heading[activeIndex];
  const currentTitle = translations.title[activeIndex];
  const currentSubtitle = translations.subtitle[activeIndex];
  const currentFooter = translations.footer[activeIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#0b6e4f] to-[#2196F3] rounded-2xl mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {currentHeading}
          </h1>
          <p className="text-lg text-gray-300 mb-1 transition-all duration-300">
            {currentSubtitle}
          </p>
          <p className="text-sm text-gray-400">
            {currentFooter}
          </p>
        </div>

        {/* Language Selection Card */}
        <motion.div
          className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-lg border border-zinc-800 p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#0b6e4f]/20 rounded-lg">
              <Globe className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white transition-all duration-300">
                {currentTitle}
              </h2>
              <p className="text-sm text-gray-300">
                {currentSubtitle}
              </p>
            </div>
          </div>

          <LanguageSelector onSelect={onLanguageSelect} />
        </motion.div>

      </motion.div>
    </div>
  );
}
