<div align="center">
  <img src="images/example.jpeg" alt="Ruby Draw Example" width="800"/>
</div>

# Ruby Draw

**Turn rough sketches into stunning drawings** — Ruby Draw is a modern web application that uses AI to transform your hand-drawn sketches into polished, professional artwork.

## ✨ Features

- **Interactive Drawing Canvas**: Full-featured drawing board powered by tldraw with support for shapes, text, and freehand drawing
- **AI-Powered Sketch Improvement**: Select any sketch and enhance it using Google's Gemini AI to create clean, professional drawings
- **Real-time Processing**: Asynchronous background job processing with Sidekiq for improved sketch generation
- **Smart Caching**: Redis-powered caching to reduce API calls and improve response times
- **Modern UI**: Clean, responsive interface with a beautiful landing page
- **GraphQL API**: Type-safe API with Rails 8 and GraphQL for efficient data fetching
- **Server-Side Rendering**: Fast initial page loads with React Router v7 SSR support

## 🛠 Tech Stack

### Frontend
- **React Router v7** (Framework mode with SSR)
- **TypeScript** for type safety
- **Vite** for fast builds and HMR
- **tldraw** for the drawing canvas
- **Tailwind CSS** for styling
- **GraphQL Request** for API communication

### Backend
- **Rails 8** with Ruby 3.3.0
- **GraphQL** API with GraphQL-Ruby
- **PostgreSQL** database
- **Redis** for caching and job queuing
- **Sidekiq** for background job processing
- **Google Gemini API** for AI-powered sketch improvement

### Infrastructure
- **Google Cloud Run** for containerized deployment
- **Secret Manager** for secure credential storage
- **Docker** for containerization

## 📁 Project Structure

```
rubydraw/
├── frontend/                 # React Router v7 frontend application
│   ├── app/
│   │   ├── components/       # React components
│   │   ├── lib/              # Utility functions and GraphQL clients
│   │   └── routes/           # Route components
│   ├── public/               # Static assets
│   └── package.json
├── backend/
│   └── rubydraw_api/         # Rails 8 GraphQL API
│       ├── app/
│       │   ├── graphql/       # GraphQL schema, types, mutations
│       │   ├── jobs/          # Sidekiq background jobs
│       │   ├── services/      # Business logic (GeminiService)
│       │   └── models/        # ActiveRecord models
│       └── config/
```

## 📄 License

MIT License - see LICENSE file for details
