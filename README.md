# 🌱 FoodLink AI

### AI-Powered Food Redistribution Platform

> **Turning Surplus Food into Hope.**

FoodLink AI is an AI-powered food redistribution platform designed to connect **restaurants, food donors, and NGOs** to reduce food waste and help distribute surplus food to people in need.

The platform combines **AI-powered assistance, smart donation management, NGO coordination, live impact tracking, and automated donation workflows** into a single web application.

---

## 🚀 Live Demo

🔗 **[View FoodLink AI Live](https://food-link-ai-wheat.vercel.app)**

🔗 **[View Source Code](https://github.com/Hariom-Namdev/FoodLink-AI)**

---

## 📌 Project Overview

Every day, large amounts of edible food are wasted while millions of people face food insecurity.

FoodLink AI aims to bridge this gap by creating a digital ecosystem where:

**Restaurants / Donors → Food Donations → AI Processing → NGOs → People in Need**

The platform helps donors list surplus food, enables NGOs to discover and claim available donations, and uses AI-powered systems to improve the overall donation workflow.

---

## ✨ Key Features

### 🤖 AI Chatbot

- AI-powered conversational assistant
- Helps users understand the platform
- Provides contextual responses
- Integrated with Google's Gemini API
- Implemented using Supabase Edge Functions

### 🧠 Smart Donation AI Agent

- AI-powered donation processing
- Helps automate donation-related workflows
- Assists with intelligent donation handling
- Integrated with the backend through Supabase Edge Functions

### 🍱 Food Donation Management

- Donors can submit surplus food
- Food information can be recorded and managed
- NGOs can discover available donations
- Donation status can be tracked throughout the workflow

### 🏢 NGO Management

- NGO-focused workflow
- NGOs can view available food donations
- NGOs can claim suitable donations
- Donation and NGO interactions are managed through the backend

### 🗺️ Live Map

- Interactive map experience
- Helps visualize food donation and NGO-related locations
- Designed to support location-based food redistribution

### 📊 Impact Tracking

The platform presents impact-oriented metrics such as:

- Meals saved
- NGOs connected
- Restaurants participating
- CO₂ savings

### 🔐 Authentication

- User authentication
- Protected application areas
- User profile management
- Supabase Authentication integration

### 🎨 Modern UI

- Responsive interface
- Modern dark-themed design
- Interactive components
- Animated visual elements
- 3D-inspired experience
- Mobile-friendly layout

---

## 🧠 AI Architecture

FoodLink AI uses AI as a functional part of the platform rather than simply adding an AI chatbot.

### AI Components

```text
                    ┌─────────────────────┐
                    │     FoodLink AI     │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ AI Chatbot  │   │ Smart Agent │   │ AI Services │
      └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Supabase Functions  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Supabase Database   │
                    └─────────────────────┘
