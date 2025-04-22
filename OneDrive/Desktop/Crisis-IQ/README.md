# CrisisIQ - Intelligent Crisis Detection & Rescue Platform

A modern, AI-driven disaster management and rescue coordination platform designed to work even under extreme network failure conditions.

## Features

- 🗺️ Real-time crisis mapping with Mapbox integration
- 🆘 Voice-enabled SOS submission system
- 🏠 Safe shelter locator with real-time capacity
- 📊 Admin dashboard for crisis monitoring
- 🌙 Dark mode support
- 📱 Responsive design for all devices

## Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- Mapbox access token (for map functionality)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/crisis-iq.git
cd crisis-iq
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Mapbox access token:
```
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Mapbox GL JS
- Heroicons
- React Hot Toast
- React Router DOM

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 