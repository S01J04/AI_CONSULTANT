# AI Voice Consultation Platform

A modern web application that enables AI-powered voice consultations using VAPI.ai, Firebase, and React. This platform provides real-time voice interactions with AI assistants, appointment scheduling, and expert consultation management.

## 🌟 Features

### Voice AI Consultation
- Real-time voice conversations with AI using VAPI.ai
- Natural language processing for human-like interactions
- Multi-turn conversation support
- Voice-to-text and text-to-voice capabilities
- Context-aware responses

### User Management
- Secure authentication via Firebase
- User profile customization
- Session history tracking
- Personalized consultation experience
- Role-based access (Admin/User)

### Appointment System
- Schedule consultations with AI assistants
- Real-time availability checking
- Appointment reminders
- Session rescheduling and cancellation
- Calendar integration

### Expert Dashboard
- Expert profile management
- Availability settings
- Session analytics
- Performance metrics
- Client history

### Admin Features
- User management
- System analytics
- Expert verification
- Session monitoring
- Performance reporting

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- VAPI.ai API key

### Environment Setup
Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_VAPI_API_KEY=your_vapi_api_key
VITE_ASSISTANT_ID=your_assistant_id
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-voice-consultation.git
cd ai-voice-consultation
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## 💡 Usage Guide

### Starting a Voice Consultation

1. Log in to your account
2. Navigate to "New Consultation"
3. Click "Start Voice Chat"
4. Allow microphone access when prompted
5. Begin speaking with the AI assistant

### Managing Appointments

1. Go to "My Appointments"
2. Select available time slot
3. Choose consultation type
4. Confirm booking
5. Receive confirmation email

### Expert Profile Setup

1. Access Expert Dashboard
2. Complete profile information
3. Set availability hours
4. Configure specializations
5. Save changes

## 🔧 Technical Architecture

### Frontend
- React.js with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- VAPI.ai SDK for voice integration

### Backend
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Real-time Database

### Voice Processing
- VAPI.ai for voice interactions
- WebRTC for real-time communication
- Speech-to-Text processing
- Text-to-Speech synthesis

## 🔐 Security Features

- End-to-end encryption for voice calls
- Secure authentication flow
- Data encryption at rest
- HIPAA compliance measures
- Regular security audits

## 🎯 Best Practices

### Voice Interactions
- Speak clearly and naturally
- Use short, precise commands
- Wait for AI response
- Check microphone settings
- Use in quiet environment

### Appointment Management
- Book in advance
- Set reminders
- Update availability regularly
- Cancel with notice
- Keep calendar synced

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- VAPI.ai for voice AI technology
- Firebase team for backend infrastructure
- React community for frontend components
- All contributors and testers

## 📞 Support

For support, email support@aivoiceconsultation.com or join our Slack channel.

## 🔄 Status

Current Version: 1.0.0
Last Updated: February 2024
Status: Active Development
