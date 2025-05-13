# Mini-CRM Platform

![Landing Page CRM Platform](https://github.com/bhargava-prashant/Mini-CRM/blob/master/client/src/assets/Screenshot%202025-05-13%20203718.png)

## 📋 Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Demonstration](#demonstration)
- [AI Integration](#ai-integration)
- [Credits](#credits)

## 🚀 Introduction

Mini-CRM is a comprehensive customer relationship management platform built as part of the Xeno SDE Internship Assignment 2025. The platform enables businesses to perform customer segmentation, create personalized marketing campaigns, and gain intelligent insights through AI integration.


**GitHub Repository:** [https://github.com/bhargava-prashant/Mini-CRM](https://github.com/bhargava-prashant/Mini-CRM)

## ✨ Features

### 1. Data Ingestion
- Secure REST APIs for customer and order data ingestion
- Pub-sub architecture using Redis Streams for asynchronous data processing
- Validation in API layer with asynchronous data persistence

### 2. Campaign Management
- Dynamic rule builder for audience segmentation
- Flexible segmentation with AND/OR conditions
- Real-time audience size preview
- Comprehensive campaign history dashboard

### 3. Campaign Delivery & Logging
- Automated campaign delivery system
- Realistic vendor API simulation (90% success, 10% failure rate)
- Detailed delivery status tracking
- Batch processing for efficient updates

### 4. Authentication
- Google OAuth 2.0 integration
- Secure access control for campaign creation and viewing

### 5. AI Integration
- Natural language to segment rules conversion
- Convert human-readable prompts to MongoDB queries
- Intelligent audience matching with AI-powered segmentation

## 🏗️ Architecture

The Mini-CRM platform is built with a microservices architecture consisting of four main components:

```
                                  ┌─────────────────┐
                                  │                 │
                                  │   Client (UI)   │
                                  │                 │
                                  └────────┬────────┘
                                           │
                                           ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│                 │              │                 │              │                 │
│   Server API    │◄────────────►│ Campaign Backend│◄────────────►│    AI-CRM       │
│   (Producer)    │              │                 │              │                 │
│                 │              └─────────────────┘              └─────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐              ┌─────────────────┐
│  Redis Streams  │              │                 │
│     Broker      │◄────────────►│ Stream Consumer │
│                 │              │                 │
└─────────────────┘              └─────────────────┘
```

**1. Server API (Producer):** Handles user authentication, product management, and order processing. Acts as a producer for Redis Streams.

**2. Stream Consumer:** Consumes messages from Redis Streams and persists data to MongoDB.

**3. Campaign Backend:** Manages campaign creation, audience segmentation, and delivery tracking.

**4. AI-CRM:** Processes natural language queries and converts them to MongoDB query objects.

**5. Client (UI):** React-based frontend for user interaction with the platform.
![Mini-CRM Campaign Platform](https://github.com/bhargava-prashant/Mini-CRM/blob/master/client/src/assets/Screenshot%202025-05-13%20204003.png)


![Mini-CRM Campaign History Platform](https://github.com/bhargava-prashant/Mini-CRM/blob/master/client/src/assets/Screenshot%202025-05-13%20204025.png)


## 🛠️ Tech Stack

### Frontend
- React.js with Vite
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

### Backend
- Node.js with Express
- MongoDB for data storage
- Redis Streams for pub-sub architecture
- JWT for authentication

### AI Integration
- Groq model for natural language processing
- Custom MongoDB query generation

## 💻 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB
- Redis Server

### 1. Clone the repository
```bash
git clone https://github.com/bhargava-prashant/Mini-CRM.git
cd Mini-CRM
```

### 2. Set up Server (Producer)
```bash
cd server
npm install
cp .env.example .env
# Update .env with your MongoDB and Redis credentials
npm start
```

### 3. Set up Stream Consumer
```bash
# In a new terminal, from the server directory
node streamConsumer.js
```

### 4. Set up Campaign Backend
```bash
cd ../campaign-backend
npm install
cp .env.example .env
# Update .env with your MongoDB credentials
npm start
```

### 5. Set up Client (UI)
```bash
cd ../client
npm install
cp .env.example .env
# Update .env with API endpoints
npm run dev
```

### 6. Set up AI-CRM
```bash
cd ../ai-crm
npm install
cp .env.example .env
# Update .env with your Groq API key
node index.js
```

## 📘 API Documentation

### Data Ingestion APIs

#### Customer Registration
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

#### Customer Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Create Order
```
POST /api/orders
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "products": [
    {
      "productId": "6821b1a753eb496e73fcdabc",
      "quantity": 2,
      "price": 15.5
    },
    {
      "productId": "6821b1a753eb496e73fcdabd",
      "quantity": 1,
      "price": 9.99
    }
  ],
  "totalAmount": 40.99
}
```

### Campaign Management APIs

#### Create Segment
```
POST /api/segments
Content-Type: application/json

{
  "name": "High Value Customers",
  "rules": {
    "id": 1,
    "type": "group",
    "operator": "AND",
    "conditions": [
      {
        "id": 1747079664995,
        "type": "condition",
        "field": "totalSpent",
        "operator": "greaterThan",
        "value": "1000"
      }
    ]
  }
}
```

#### Create Campaign
```
POST /api/campaigns
Content-Type: application/json

{
  "name": "Summer Sale",
  "segmentId": "682251f6000b62b78095f559"
}
```

### AI Integration API

#### Natural Language to Query
```
POST /ai-query
Content-Type: application/json

{
  "prompt": "People who have ordered in 6 months and spent over ₹1000"
}
```

## 🎥 Demonstration

A demonstration video is available [here](https://prashant-bhargava-dev.onrender.com/demo) showcasing the following features:

1. User authentication using Google OAuth
2. Campaign creation with dynamic rule builder
3. Audience segmentation and preview
4. Campaign delivery and tracking
5. AI-powered natural language processing for segmentation

## 🧠 AI Integration

The Mini-CRM platform integrates AI capabilities through the Groq model to convert natural language prompts into MongoDB query objects. For example:

Prompt: "People who have ordered in 6 months and spent over ₹1000"

Gets converted to:
```json
{
  "type": "segment",
  "query": {
    "$and": [
      {
        "lastOrdered": {
          "$gt": "2023-03-15T00:00:00.000Z"
        }
      },
      {
        "totalSpent": {
          "$gt": 1000
        }
      }
    ]
  }
}
```

## 📊 Database Schema

### User Collection
```json
{
  "_id": "6822d4aaf7c38204723521b3",
  "name": "User 1",
  "email": "user1@example.com",
  "password": "password123",
  "loginCount": 30.5,
  "visitCount": 45,
  "orderCount": 2,
  "totalSpent": 1181,
  "totalOrderValue": 0,
  "lastActive": "2025-05-10T05:12:10.993Z",
  "isInactive": false,
  "accountCreated": "2024-05-14T02:45:25.637Z",
  "lastOrdered": "2025-05-13T05:12:10.996Z",
  "firstPurchaseDate": "2025-05-13T05:12:10.996Z",
  "orderHistory": []
}
```

### Orders Collection
```json
{
  "_id": "68223b28c64b90829f3f025f",
  "customerId": "68223abb07dbbc8da966538d",
  "products": [
    {
      "productId": "6821b1a753eb496e73fcdabc",
      "quantity": 2,
      "price": 15.5
    },
    {
      "productId": "6821b1a753eb496e73fcdabd",
      "quantity": 1,
      "price": 9.99
    }
  ],
  "totalAmount": 40.99,
  "status": "PENDING",
  "orderReference": "887041cd-7ff2-4b29-8e8b-917b43b77ab1",
  "createdAt": "2025-05-12T12:23:52.309Z",
  "lastPurchaseDate": "2025-05-12T12:23:52.355Z",
  "orderCount": 2,
  "totalSpent": 319.99
}
```

### Campaign Collection
```json
{
  "_id": "682251f7000b62b78095f55b",
  "name": "testing",
  "segmentId": "682251f6000b62b78095f559",
  "audienceSize": 0,
  "sentCount": 0,
  "failedCount": 0,
  "status": "sent",
  "createdAt": "2025-05-12T14:01:11.034Z"
}
```

### Segment Collection
```json
{
  "_id": "682251f6000b62b78095f559",
  "name": "testing Segment",
  "rules": {
    "id": 1,
    "type": "group",
    "operator": "AND",
    "conditions": [
      {
        "id": 1747079664995,
        "type": "condition",
        "field": "totalSpent",
        "operator": "greaterThan",
        "value": "100"
      }
    ]
  },
  "createdAt": "2025-05-12T14:01:10.964Z"
}
```

## 🚧 Known Limitations

1. The campaign delivery system currently simulates deliveries rather than sending actual messages.
2. The AI integration is limited to segmentation queries and doesn't yet support message generation.
3. The batch processing system has a fixed batch size that may need optimization for larger datasets.

## 🙏 Credits

This project was developed by Prashant Bhargava as part of the Xeno SDE Internship Assignment 2025.
