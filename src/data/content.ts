// Realistic Indian dummy data for FoodLink AI

export const restaurants = [
  { name: "Domino's", city: "Mumbai", category: "Packed Food", meals: 420 },
  { name: "Pizza Hut", city: "Delhi", category: "Snacks", meals: 310 },
  { name: "Haldiram", city: "Noida", category: "Snacks", meals: 680 },
  { name: "Bikanervala", city: "Gurugram", category: "Sweets", meals: 540 },
  { name: "Barbeque Nation", city: "Bengaluru", category: "Rice", meals: 760 },
  { name: "Wow Momo", city: "Pune", category: "Snacks", meals: 230 },
  { name: "Paradise Biryani", city: "Hyderabad", category: "Rice", meals: 890 },
  { name: "Subway", city: "Chennai", category: "Bread", meals: 180 },
  { name: "McDonald's", city: "Kolkata", category: "Snacks", meals: 390 },
  { name: "Burger King", city: "Ahmedabad", category: "Snacks", meals: 260 },
  { name: "Cafe Coffee Day", city: "Jaipur", category: "Juices", meals: 120 },
  { name: "Starbucks", city: "Lucknow", category: "Bakery", meals: 95 },
  { name: "Behrouz Biryani", city: "Bhopal", category: "Rice", meals: 510 },
  { name: "Theobroma", city: "Indore", category: "Bakery", meals: 210 },
  { name: "Saravana Bhavan", city: "Chennai", category: "Rice", meals: 640 },
  { name: "Mainland China", city: "Kochi", category: "Vegetables", meals: 430 },
];

export interface NGO {
  name: string;
  city: string;
  served: number;
  logo: string;
  category: string;
  rating: number;
  verified: boolean;
  phone: string;
  email: string;
  address: string;
  capacity: number;
  established: number;
}

export const ngos: NGO[] = [
  { name: "Akshaya Patra Foundation", city: "Bengaluru", served: 2480000, logo: "🫶", category: "Midday Meal", rating: 4.9, verified: true, phone: "+91-80-7197-7900", email: "info@akshayapatra.org", address: "Bengaluru, Karnataka", capacity: 50000, established: 2000 },
  { name: "Feeding India", city: "Delhi", served: 1850000, logo: "🍽️", category: "Food Rescue", rating: 4.8, verified: true, phone: "+91-11-4655-4321", email: "connect@feedingindia.org", address: "New Delhi, Delhi", capacity: 30000, established: 2014 },
  { name: "Robin Hood Army", city: "Mumbai", served: 1630000, logo: "🏹", category: "Food Rescue", rating: 4.7, verified: true, phone: "+91-22-4000-1234", email: "mumbai@rha.org", address: "Mumbai, Maharashtra", capacity: 25000, established: 2014 },
  { name: "Goonj", city: "Delhi", served: 980000, logo: "🌱", category: "Relief & Aid", rating: 4.6, verified: true, phone: "+91-11-2697-9232", email: "mail@goonj.org", address: "New Delhi, Delhi", capacity: 20000, established: 1999 },
  { name: "Smile Foundation", city: "Hyderabad", served: 1240000, logo: "😊", category: "Child Welfare", rating: 4.5, verified: true, phone: "+91-40-2345-6789", email: "info@smilefoundation.org", address: "Hyderabad, Telangana", capacity: 22000, established: 2002 },
  { name: "Annakshetra Foundation", city: "Jaipur", served: 760000, logo: "🌾", category: "Food Rescue", rating: 4.4, verified: true, phone: "+91-141-222-3333", email: "contact@annakshetra.org", address: "Jaipur, Rajasthan", capacity: 15000, established: 2015 },
  { name: "ISKCON Food Relief", city: "Mumbai", served: 2100000, logo: "🪔", category: "Midday Meal", rating: 4.8, verified: true, phone: "+91-22-2870-0000", email: "foodrelief@iskconmumbai.org", address: "Mumbai, Maharashtra", capacity: 45000, established: 2004 },
  { name: "No Food Waste", city: "Coimbatore", served: 540000, logo: "♻️", category: "Food Rescue", rating: 4.5, verified: true, phone: "+91-422-456-7890", email: "info@nofoodwaste.in", address: "Coimbatore, Tamil Nadu", capacity: 12000, established: 2016 },
  { name: "Roti Bank Mumbai", city: "Mumbai", served: 420000, logo: "🥖", category: "Food Rescue", rating: 4.3, verified: true, phone: "+91-22-2820-2020", email: "rotibankmumbai@gmail.com", address: "Mumbai, Maharashtra", capacity: 10000, established: 2017 },
  { name: "Delhi Food Bank", city: "Delhi", served: 610000, logo: "🏦", category: "Food Bank", rating: 4.4, verified: true, phone: "+91-11-4100-5678", email: "info@delhifoodbank.org", address: "New Delhi, Delhi", capacity: 18000, established: 2012 },
  { name: "Khalsa Aid India", city: "Amritsar", served: 390000, logo: "🪙", category: "Relief & Aid", rating: 4.6, verified: true, phone: "+91-183-501-2345", email: "india@khalsaaid.org", address: "Amritsar, Punjab", capacity: 8000, established: 1999 },
  { name: "Rise Against Hunger India", city: "Bengaluru", served: 880000, logo: "✊", category: "Meal Packaging", rating: 4.7, verified: true, phone: "+91-80-4900-1234", email: "info@riseagainsthungerindia.org", address: "Bengaluru, Karnataka", capacity: 20000, established: 2013 },
  { name: "Samarpan Foundation", city: "Delhi", served: 520000, logo: "🤝", category: "Child Welfare", rating: 4.3, verified: true, phone: "+91-11-2410-9999", email: "info@samarpanfoundation.org", address: "New Delhi, Delhi", capacity: 14000, established: 2010 },
  { name: "Make-A-Difference", city: "Bengaluru", served: 480000, logo: "💙", category: "Child Welfare", rating: 4.4, verified: true, phone: "+91-80-2660-1234", email: "info@makeadiff.in", address: "Bengaluru, Karnataka", capacity: 11000, established: 2006 },
  { name: "Shanti Ashram", city: "Coimbatore", served: 340000, logo: "🕊️", category: "Community Kitchen", rating: 4.2, verified: true, phone: "+91-422-245-6789", email: "shanti@ashram.org", address: "Coimbatore, Tamil Nadu", capacity: 9000, established: 1990 },
  { name: "Seva Kitchen", city: "Pune", served: 410000, logo: "🍲", category: "Community Kitchen", rating: 4.5, verified: true, phone: "+91-20-6640-1234", email: "info@sevakitchen.org", address: "Pune, Maharashtra", capacity: 10000, established: 2015 },
  { name: "Hunger Free India", city: "Hyderabad", served: 670000, logo: "🍎", category: "Food Rescue", rating: 4.3, verified: true, phone: "+91-40-6789-1234", email: "contact@hungerfreeindia.org", address: "Hyderabad, Telangana", capacity: 16000, established: 2018 },
  { name: "Food for Soul", city: "Chennai", served: 380000, logo: "🌟", category: "Community Kitchen", rating: 4.2, verified: true, phone: "+91-44-2814-5678", email: "info@foodforsoul.in", address: "Chennai, Tamil Nadu", capacity: 9000, established: 2017 },
  { name: "Annamrita Foundation", city: "Mumbai", served: 1320000, logo: "🍛", category: "Midday Meal", rating: 4.7, verified: true, phone: "+91-22-3322-1122", email: "info@annamrita.org", address: "Mumbai, Maharashtra", capacity: 28000, established: 2004 },
  { name: "Mera Parivar", city: "Noida", served: 290000, logo: "👨‍👩‍👧", category: "Child Welfare", rating: 4.1, verified: true, phone: "+91-120-456-7890", email: "info@meraparivar.org", address: "Noida, Uttar Pradesh", capacity: 7000, established: 2011 },
  { name: "Bhookh Mitao", city: "Ahmedabad", served: 360000, logo: "🥘", category: "Food Bank", rating: 4.3, verified: true, phone: "+91-79-4040-1234", email: "info@bhookhmitao.org", address: "Ahmedabad, Gujarat", capacity: 9000, established: 2016 },
  { name: "Uday Foundation", city: "Delhi", served: 450000, logo: "☀️", category: "Child Welfare", rating: 4.4, verified: true, phone: "+91-11-2656-1234", email: "info@udayfoundation.org", address: "New Delhi, Delhi", capacity: 11000, established: 2007 },
  { name: "Pratham Education Foundation", city: "Mumbai", served: 580000, logo: "📚", category: "Child Welfare", rating: 4.6, verified: true, phone: "+91-22-6161-1234", email: "info@pratham.org", address: "Mumbai, Maharashtra", capacity: 13000, established: 1995 },
  { name: "Action Against Hunger", city: "Mumbai", served: 720000, logo: "🌍", category: "Relief & Aid", rating: 4.5, verified: true, phone: "+91-22-6705-1234", email: "india@actionagainsthunger.org", address: "Mumbai, Maharashtra", capacity: 17000, established: 2014 },
  { name: "Salaam Baalak Trust", city: "Delhi", served: 320000, logo: "🎭", category: "Child Welfare", rating: 4.3, verified: true, phone: "+91-11-2374-1234", email: "info@salaambaalak.org", address: "New Delhi, Delhi", capacity: 8000, established: 1988 },
  { name: "Asha Deep Foundation", city: "Bengaluru", served: 280000, logo: "🔥", category: "Community Kitchen", rating: 4.1, verified: true, phone: "+91-80-2345-6789", email: "info@ashadeep.org", address: "Bengaluru, Karnataka", capacity: 7000, established: 2013 },
  { name: "Ekam Foundation", city: "Chennai", served: 310000, logo: "💧", category: "Child Welfare", rating: 4.2, verified: true, phone: "+91-44-2827-1234", email: "info@ekamoneness.org", address: "Chennai, Tamil Nadu", capacity: 8000, established: 2010 },
  { name: "Sankalp Volunteer Society", city: "Hyderabad", served: 240000, logo: "✨", category: "Food Rescue", rating: 4.0, verified: true, phone: "+91-40-2476-1234", email: "info@sankalpindia.org", address: "Hyderabad, Telangana", capacity: 6000, established: 2012 },
  { name: "Khidmat Foundation", city: "Kolkata", served: 270000, logo: "🤲", category: "Food Bank", rating: 4.1, verified: true, phone: "+91-33-2289-1234", email: "info@khidmat.org", address: "Kolkata, West Bengal", capacity: 7000, established: 2015 },
  { name: "Aahar Foundation", city: "Pune", served: 350000, logo: "🍱", category: "Food Rescue", rating: 4.2, verified: true, phone: "+91-20-3010-1234", email: "info@aaharfoundation.org", address: "Pune, Maharashtra", capacity: 9000, established: 2014 },
  { name: "Jeevan Anand", city: "Surat", served: 220000, logo: "🌿", category: "Community Kitchen", rating: 4.0, verified: true, phone: "+91-261-245-1234", email: "info@jeevananand.org", address: "Surat, Gujarat", capacity: 6000, established: 2016 },
  { name: "Vaishnodevi Annadata", city: "Kolkata", served: 430000, logo: "🫗", category: "Food Rescue", rating: 4.3, verified: true, phone: "+91-33-2476-8901", email: "annadata@vaishnodevi.org", address: "Kolkata, West Bengal", capacity: 11000, established: 2013 },
  { name: "Sahyadri Food Mission", city: "Nagpur", served: 260000, logo: "🌽", category: "Food Bank", rating: 4.1, verified: true, phone: "+91-712-280-3456", email: "info@sahyadrifoodmission.org", address: "Nagpur, Maharashtra", capacity: 7000, established: 2015 },
];

export const ngoCategories = [
  "All",
  "Food Rescue",
  "Midday Meal",
  "Community Kitchen",
  "Food Bank",
  "Child Welfare",
  "Relief & Aid",
  "Meal Packaging",
];

export const cities = [
  "Delhi", "Mumbai", "Pune", "Bengaluru", "Hyderabad", "Chennai", "Ahmedabad",
  "Jaipur", "Lucknow", "Bhopal", "Indore", "Nagpur", "Patna", "Kolkata", "Surat",
  "Chandigarh", "Noida", "Gurugram", "Kochi", "Visakhapatnam", "Mysuru",
  "Coimbatore", "Varanasi", "Prayagraj", "Kanpur", "Udaipur", "Jodhpur",
  "Raipur", "Ranchi", "Guwahati",
];

export const foodCategories = [
  "Rice", "Dal", "Chapati", "Vegetables", "Fruits", "Milk", "Bread",
  "Sweets", "Snacks", "Packed Food", "Bakery", "Juices", "Water Bottles",
];

// Approx lat/lng for map placement (normalized 0-100 for SVG)
export const cityCoords: Record<string, { x: number; y: number }> = {
  Delhi: { x: 42, y: 22 }, Mumbai: { x: 22, y: 55 }, Pune: { x: 26, y: 60 },
  Bengaluru: { x: 38, y: 82 }, Hyderabad: { x: 45, y: 62 }, Chennai: { x: 52, y: 82 },
  Ahmedabad: { x: 22, y: 38 }, Jaipur: { x: 35, y: 28 }, Lucknow: { x: 52, y: 24 },
  Bhopal: { x: 40, y: 40 }, Indore: { x: 33, y: 42 }, Nagpur: { x: 48, y: 50 },
  Patna: { x: 62, y: 24 }, Kolkata: { x: 70, y: 40 }, Surat: { x: 22, y: 48 },
  Chandigarh: { x: 40, y: 16 }, Noida: { x: 43, y: 22 }, Gurugram: { x: 41, y: 23 },
  Kochi: { x: 40, y: 92 }, Visakhapatnam: { x: 58, y: 64 }, Mysuru: { x: 36, y: 84 },
  Coimbatore: { x: 40, y: 86 }, Varanasi: { x: 58, y: 28 }, Prayagraj: { x: 56, y: 30 },
  Kanpur: { x: 54, y: 26 }, Udaipur: { x: 30, y: 32 }, Jodhpur: { x: 27, y: 30 },
  Raipur: { x: 55, y: 50 }, Ranchi: { x: 60, y: 38 }, Guwahati: { x: 80, y: 28 },
};

export const latestDonations = [
  { restaurant: "Paradise Biryani", city: "Hyderabad", food: "Rice", meals: 120, time: "2 min ago", status: "available" },
  { restaurant: "Haldiram", city: "Noida", food: "Snacks", meals: 85, time: "8 min ago", status: "claimed" },
  { restaurant: "Barbeque Nation", city: "Bengaluru", food: "Vegetables", meals: 200, time: "15 min ago", status: "available" },
  { restaurant: "Theobroma", city: "Indore", food: "Bakery", meals: 60, time: "22 min ago", status: "picked" },
  { restaurant: "Domino's", city: "Mumbai", food: "Packed Food", meals: 140, time: "30 min ago", status: "delivered" },
  { restaurant: "Bikanervala", city: "Gurugram", food: "Sweets", meals: 95, time: "41 min ago", status: "available" },
  { restaurant: "McDonald's", city: "Kolkata", food: "Snacks", meals: 110, time: "52 min ago", status: "claimed" },
  { restaurant: "Behrouz Biryani", city: "Bhopal", food: "Rice", meals: 160, time: "1 hr ago", status: "delivered" },
];

export const testimonials = [
  { name: "Ananya Sharma", role: "Operations Lead, Feeding India", quote: "FoodLink AI cut our pickup coordination time by 70%. The freshness predictions are remarkably accurate.", avatar: "AS" },
  { name: "Rohan Mehta", role: "Owner, Paradise Biryani", quote: "We used to throw away 40kg of rice daily. Now it feeds 200+ people every night. The dashboard makes it effortless.", avatar: "RM" },
  { name: "Dr. Kavita Nair", role: "Director, Akshaya Patra", quote: "The AI demand forecasting helps us pre-position volunteers where they're needed most. Truly transformative.", avatar: "KN" },
  { name: "Arjun Reddy", role: "Volunteer, Hyderabad", quote: "The route optimization and reward badges keep me motivated. I've delivered 1,200 meals in 3 months.", avatar: "AR" },
];

export const successStories = [
  { title: "Mumbai's Wedding Season Rescue", city: "Mumbai", meals: 48000, ngo: "Robin Hood Army", summary: "During peak wedding season, 12 banquet halls redirected surplus meals to 6 NGOs across 4 nights." },
  { title: "Bengaluru Tech Park Initiative", city: "Bengaluru", meals: 32000, ngo: "Feeding India", summary: "23 IT cafeterias now donate daily surplus, feeding 900+ construction workers every evening." },
  { title: "Delhi Bakery Night Program", city: "Delhi", meals: 18500, ngo: "Delhi Food Bank", summary: "Bakeries donate end-of-day bread and pastries to shelters before expiry, zero waste achieved." },
];

export const faqs = [
  { q: "How does FoodLink AI predict food freshness?", a: "Our model analyzes food category, preparation time, storage temperature, and ambient conditions to estimate remaining edible hours with 94% accuracy." },
  { q: "Is there a cost for restaurants or NGOs?", a: "No. FoodLink AI is free for all donors, NGOs, and volunteers. We're a mission-driven platform funded by impact grants." },
  { q: "How do volunteers get assigned deliveries?", a: "Volunteers receive smart notifications for nearby pickups. Our route optimizer minimizes travel time and maximizes meals delivered per trip." },
  { q: "Which cities are currently supported?", a: "We operate across 30+ Indian cities including Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, and more, expanding monthly." },
  { q: "How is food safety ensured?", a: "Every donation includes preparation time, expiry prediction, and QR-code verified pickup. NGOs can reject items that fail freshness checks." },
  { q: "Can I track my organization's impact?", a: "Yes. Restaurants and NGOs get dashboards showing meals donated, CO₂ saved, people fed, and monthly trends with exportable reports." },
];

export const stats = [
  { label: "Meals Saved", value: 8420000, suffix: "+", icon: "utensils" },
  { label: "NGOs Connected", value: 1240, suffix: "+", icon: "heart-handshake" },
  { label: "Restaurants", value: 5600, suffix: "+", icon: "store" },
  { label: "Volunteers", value: 8900, suffix: "+", icon: "bike" },
  { label: "CO₂ Saved (kg)", value: 1850000, suffix: "", icon: "leaf" },
  { label: "People Fed", value: 3100000, suffix: "+", icon: "users" },
];

// Monthly donation trend (last 12 months)
export const monthlyTrend = [
  { month: "Aug", meals: 420000, co2: 92000 },
  { month: "Sep", meals: 485000, co2: 106000 },
  { month: "Oct", meals: 560000, co2: 123000 },
  { month: "Nov", meals: 610000, co2: 134000 },
  { month: "Dec", meals: 720000, co2: 158000 },
  { month: "Jan", meals: 690000, co2: 151000 },
  { month: "Feb", meals: 740000, co2: 162000 },
  { month: "Mar", meals: 810000, co2: 178000 },
  { month: "Apr", meals: 760000, co2: 167000 },
  { month: "May", meals: 830000, co2: 182000 },
  { month: "Jun", meals: 905000, co2: 199000 },
  { month: "Jul", meals: 980000, co2: 215000 },
];

export const cityWiseData = [
  { city: "Delhi", meals: 1240000 },
  { city: "Mumbai", meals: 1180000 },
  { city: "Bengaluru", meals: 920000 },
  { city: "Hyderabad", meals: 740000 },
  { city: "Chennai", meals: 680000 },
  { city: "Kolkata", meals: 590000 },
  { city: "Pune", meals: 470000 },
  { city: "Ahmedabad", meals: 380000 },
];

export const foodCategoryData = [
  { name: "Rice", value: 28 },
  { name: "Snacks", value: 19 },
  { name: "Vegetables", value: 16 },
  { name: "Bakery", value: 12 },
  { name: "Sweets", value: 9 },
  { name: "Juices", value: 7 },
  { name: "Other", value: 9 },
];

export const aiFeatures = [
  { title: "Freshness Prediction", desc: "Estimates remaining edible hours using food type, prep time, and storage conditions.", icon: "clock", accent: "from-emerald-400 to-green-500" },
  { title: "Nearest NGO Matching", desc: "AI recommends the closest, best-capacity NGO for every donation in real time.", icon: "navigation", accent: "from-lime-400 to-emerald-500" },
  { title: "Demand Forecasting", desc: "Predicts where and when food will be needed most, optimizing volunteer deployment.", icon: "trending-up", accent: "from-green-400 to-teal-500" },
  { title: "Image Classification", desc: "Recognizes food categories from photos to auto-fill donation details.", icon: "scan-eye", accent: "from-emerald-400 to-lime-500" },
  { title: "Duplicate Detection", desc: "Flags repeat or fraudulent donations to maintain platform integrity.", icon: "shield-check", accent: "from-teal-400 to-green-500" },
  { title: "Route Optimization", desc: "Minimizes volunteer travel time while maximizing meals delivered per trip.", icon: "route", accent: "from-lime-400 to-green-500" },
  { title: "AI Chatbot", desc: "24/7 assistant guides restaurants through donation and NGOs through claiming.", icon: "bot", accent: "from-green-400 to-emerald-500" },
  { title: "Smart Notifications", desc: "Context-aware alerts for expiring food, nearby pickups, and impact milestones.", icon: "bell-ring", accent: "from-emerald-400 to-teal-500" },
];

export const trustedBy = [
  "Akshaya Patra", "Feeding India", "Robin Hood Army", "Goonj", "Smile Foundation",
  "ISKCON Food Relief", "No Food Waste", "Khalsa Aid India", "Rise Against Hunger",
];
