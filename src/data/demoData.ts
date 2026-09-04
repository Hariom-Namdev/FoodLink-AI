import type { Donation } from '../lib/supabase';

// Clearly marked demo data — used only as fallback when the database is empty.
// All IDs are prefixed with "demo-" so they never collide with real records.

export const demoDonations: Donation[] = [
  { id: 'demo-1', restaurant_id: 'demo-r1', restaurant_name: 'Paradise Biryani', food_item: 'Veg Biryani', category: 'Rice', quantity: 120, meals: 480, city: 'Hyderabad', lat: 17.385, lng: 78.4867, prep_time: '2026-09-04T10:00:00Z', expiry_hours: 6, freshness_score: 94, status: 'available', image_url: '', created_at: '2026-09-04T10:30:00Z' },
  { id: 'demo-2', restaurant_id: 'demo-r2', restaurant_name: 'Haldiram', food_item: 'Snacks Platter', category: 'Snacks', quantity: 85, meals: 170, city: 'Noida', lat: 28.5355, lng: 77.391, prep_time: '2026-09-04T09:00:00Z', expiry_hours: 4, freshness_score: 88, status: 'available', image_url: '', created_at: '2026-09-04T09:15:00Z' },
  { id: 'demo-3', restaurant_id: 'demo-r3', restaurant_name: 'Barbeque Nation', food_item: 'Mixed Vegetables', category: 'Vegetables', quantity: 200, meals: 400, city: 'Bengaluru', lat: 12.9716, lng: 77.5946, prep_time: '2026-09-04T11:00:00Z', expiry_hours: 8, freshness_score: 91, status: 'available', image_url: '', created_at: '2026-09-04T11:20:00Z' },
  { id: 'demo-4', restaurant_id: 'demo-r4', restaurant_name: "Domino's", food_item: 'Pizza Slices (40)', category: 'Packed Food', quantity: 40, meals: 120, city: 'Mumbai', lat: 19.076, lng: 72.8777, prep_time: '2026-09-04T08:00:00Z', expiry_hours: 3, freshness_score: 76, status: 'claimed', image_url: '', created_at: '2026-09-04T08:30:00Z' },
  { id: 'demo-5', restaurant_id: 'demo-r5', restaurant_name: 'Theobroma', food_item: 'Bread & Pastries', category: 'Bakery', quantity: 60, meals: 60, city: 'Indore', lat: 22.7196, lng: 75.8577, prep_time: '2026-09-04T07:00:00Z', expiry_hours: 2, freshness_score: 65, status: 'picked', image_url: '', created_at: '2026-09-04T07:45:00Z' },
  { id: 'demo-6', restaurant_id: 'demo-r6', restaurant_name: 'Bikanervala', food_item: 'Sweets & Desserts', category: 'Sweets', quantity: 95, meals: 190, city: 'Gurugram', lat: 28.4595, lng: 77.0266, prep_time: '2026-09-03T14:00:00Z', expiry_hours: 0, freshness_score: 92, status: 'delivered', image_url: '', created_at: '2026-09-03T14:30:00Z' },
  { id: 'demo-7', restaurant_id: 'demo-r7', restaurant_name: "McDonald's", food_item: 'Burger Meals (50)', category: 'Snacks', quantity: 50, meals: 150, city: 'Kolkata', lat: 22.5726, lng: 88.3639, prep_time: '2026-09-03T12:00:00Z', expiry_hours: 0, freshness_score: 89, status: 'delivered', image_url: '', created_at: '2026-09-03T12:20:00Z' },
  { id: 'demo-8', restaurant_id: 'demo-r8', restaurant_name: 'Behrouz Biryani', food_item: 'Dal Makhani', category: 'Rice', quantity: 160, meals: 320, city: 'Bhopal', lat: 23.2599, lng: 77.4126, prep_time: '2026-09-03T10:00:00Z', expiry_hours: 0, freshness_score: 58, status: 'removed', image_url: '', created_at: '2026-09-03T10:15:00Z' },
  { id: 'demo-9', restaurant_id: 'demo-r9', restaurant_name: 'Saravana Bhavan', food_item: 'Idli & Sambar', category: 'Rice', quantity: 180, meals: 360, city: 'Chennai', lat: 13.0827, lng: 80.2707, prep_time: '2026-09-04T06:00:00Z', expiry_hours: 5, freshness_score: 93, status: 'available', image_url: '', created_at: '2026-09-04T06:30:00Z' },
  { id: 'demo-10', restaurant_id: 'demo-r10', restaurant_name: 'Mainland China', food_item: 'Veg Noodles', category: 'Vegetables', quantity: 75, meals: 150, city: 'Kochi', lat: 9.9312, lng: 76.2673, prep_time: '2026-09-04T05:00:00Z', expiry_hours: 7, freshness_score: 87, status: 'claimed', image_url: '', created_at: '2026-09-04T05:45:00Z' },
];

export interface DemoProfile {
  id: string;
  full_name: string;
  role: string;
  organization: string;
  city: string;
  phone: string;
  created_at: string;
  donation_count?: number;
}

export const demoRestaurants: DemoProfile[] = [
  { id: 'demo-r1', full_name: 'Rohan Mehta', role: 'restaurant', organization: 'Paradise Biryani', city: 'Hyderabad', phone: '+91-98765-43210', created_at: '2025-08-15T10:00:00Z', donation_count: 124 },
  { id: 'demo-r2', full_name: 'Anita Desai', role: 'restaurant', organization: 'Haldiram', city: 'Noida', phone: '+91-98765-43211', created_at: '2025-09-02T10:00:00Z', donation_count: 89 },
  { id: 'demo-r3', full_name: 'Vikram Shah', role: 'restaurant', organization: 'Barbeque Nation', city: 'Bengaluru', phone: '+91-98765-43212', created_at: '2025-07-19T10:00:00Z', donation_count: 156 },
  { id: 'demo-r4', full_name: 'Priya Nair', role: 'restaurant', organization: "Domino's", city: 'Mumbai', phone: '+91-98765-43213', created_at: '2025-10-11T10:00:00Z', donation_count: 67 },
  { id: 'demo-r5', full_name: 'Arjun Kumar', role: 'restaurant', organization: 'Theobroma', city: 'Indore', phone: '+91-98765-43214', created_at: '2025-11-23T10:00:00Z', donation_count: 42 },
  { id: 'demo-r6', full_name: 'Sneha Gupta', role: 'restaurant', organization: 'Bikanervala', city: 'Gurugram', phone: '+91-98765-43215', created_at: '2025-06-05T10:00:00Z', donation_count: 198 },
];

export const demoNGOs: DemoProfile[] = [
  { id: 'demo-n1', full_name: 'Ananya Sharma', role: 'ngo', organization: 'Feeding India', city: 'Delhi', phone: '+91-11-4655-4321', created_at: '2025-01-15T10:00:00Z' },
  { id: 'demo-n2', full_name: 'Dr. Kavita Nair', role: 'ngo', organization: 'Akshaya Patra Foundation', city: 'Bengaluru', phone: '+91-80-7197-7900', created_at: '2025-02-20T10:00:00Z' },
  { id: 'demo-n3', full_name: 'Rajesh Singh', role: 'ngo', organization: 'Robin Hood Army', city: 'Mumbai', phone: '+91-22-4000-1234', created_at: '2025-03-10T10:00:00Z' },
  { id: 'demo-n4', full_name: 'Meera Joshi', role: 'ngo', organization: 'No Food Waste', city: 'Coimbatore', phone: '+91-422-456-7890', created_at: '2025-04-18T10:00:00Z' },
  { id: 'demo-n5', full_name: 'Sunil Thomas', role: 'ngo', organization: 'Delhi Food Bank', city: 'Delhi', phone: '+91-11-4100-5678', created_at: '2025-05-22T10:00:00Z' },
];

export const demoVolunteers: DemoProfile[] = [
  { id: 'demo-v1', full_name: 'Arjun Reddy', role: 'volunteer', organization: 'Independent', city: 'Hyderabad', phone: '+91-98800-11111', created_at: '2025-06-01T10:00:00Z' },
  { id: 'demo-v2', full_name: 'Karthik Iyer', role: 'volunteer', organization: 'Independent', city: 'Chennai', phone: '+91-98800-22222', created_at: '2025-07-14T10:00:00Z' },
  { id: 'demo-v3', full_name: 'Deepak Yadav', role: 'volunteer', organization: 'Independent', city: 'Pune', phone: '+91-98800-33333', created_at: '2025-08-03T10:00:00Z' },
  { id: 'demo-v4', full_name: 'Farhan Khan', role: 'volunteer', organization: 'Independent', city: 'Kolkata', phone: '+91-98800-44444', created_at: '2025-09-19T10:00:00Z' },
  { id: 'demo-v5', full_name: 'Lakshmi Pillai', role: 'volunteer', organization: 'Independent', city: 'Bengaluru', phone: '+91-98800-55555', created_at: '2025-10-25T10:00:00Z' },
];

export const demoFraudFlags = [
  { id: 'demo-f1', full_name: 'Behrouz Biryani', role: 'removed', organization: 'Dal Makhani', city: 'Bhopal', phone: '', created_at: '2026-09-03T10:15:00Z', donation_count: 58 },
  { id: 'demo-f2', full_name: 'Theobroma', role: 'donation', organization: 'Bread & Pastries', city: 'Indore', phone: '', created_at: '2026-09-04T07:45:00Z', donation_count: 65 },
  { id: 'demo-f3', full_name: 'Quick Bites #4821', role: 'donation', organization: 'Duplicate listing', city: 'Mumbai', phone: '', created_at: '2026-09-04T06:00:00Z', donation_count: 42 },
];

export interface DemoActivityLog {
  id: string;
  action: string;
  ngo_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export const demoActivityLogs: DemoActivityLog[] = [
  { id: 'demo-al1', action: 'donation_detected', ngo_id: null, details: { food_item: 'Veg Biryani', restaurant_name: 'Paradise Biryani' }, created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: 'demo-al2', action: 'validated', ngo_id: null, details: { food_item: 'Veg Biryani', restaurant_name: 'Paradise Biryani' }, created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
  { id: 'demo-al3', action: 'ngo_notified', ngo_id: 'demo-n1', details: { food_item: 'Veg Biryani', ngo_name: 'Feeding India' }, created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: 'demo-al4', action: 'ngo_accepted', ngo_id: 'demo-n1', details: { food_item: 'Veg Biryani', ngo_name: 'Feeding India' }, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'demo-al5', action: 'task_completed', ngo_id: 'demo-n1', details: { food_item: 'Veg Biryani', ngo_name: 'Feeding India' }, created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
  { id: 'demo-al6', action: 'donation_detected', ngo_id: null, details: { food_item: 'Snacks Platter', restaurant_name: 'Haldiram' }, created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: 'demo-al7', action: 'validated', ngo_id: null, details: { food_item: 'Snacks Platter', restaurant_name: 'Haldiram' }, created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
  { id: 'demo-al8', action: 'ngo_notified', ngo_id: 'demo-n3', details: { food_item: 'Snacks Platter', ngo_name: 'Robin Hood Army' }, created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  { id: 'demo-al9', action: 'donation_delivered', ngo_id: 'demo-n2', details: { food_item: 'Sweets & Desserts', ngo_name: 'Akshaya Patra' }, created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'demo-al10', action: 'task_completed', ngo_id: 'demo-n2', details: { food_item: 'Sweets & Desserts', ngo_name: 'Akshaya Patra' }, created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString() },
];

export interface DemoAgentTask {
  id: string;
  donation_id: string;
  status: string;
  current_ngo_id: string | null;
  notified_ngo_ids: string[];
  retry_count: number;
  timeout_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  donation?: {
    food_item: string;
    restaurant_name: string;
    city: string;
    quantity: number;
    meals: number;
    category: string;
    freshness_score: number;
    status: string;
  };
  current_ngo?: {
    name: string;
    city: string;
    category: string;
  } | null;
}

export const demoAgentTasks: DemoAgentTask[] = [
  {
    id: 'demo-t1',
    donation_id: 'demo-1',
    status: 'awaiting_response',
    current_ngo_id: 'demo-n1',
    notified_ngo_ids: ['demo-n1'],
    retry_count: 0,
    timeout_at: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    error: null,
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    donation: { food_item: 'Veg Biryani', restaurant_name: 'Paradise Biryani', city: 'Hyderabad', quantity: 120, meals: 480, category: 'Rice', freshness_score: 94, status: 'available' },
    current_ngo: { name: 'Feeding India', city: 'Delhi', category: 'Food Rescue' },
  },
  {
    id: 'demo-t2',
    donation_id: 'demo-2',
    status: 'validating',
    current_ngo_id: null,
    notified_ngo_ids: [],
    retry_count: 0,
    timeout_at: null,
    error: null,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    donation: { food_item: 'Snacks Platter', restaurant_name: 'Haldiram', city: 'Noida', quantity: 85, meals: 170, category: 'Snacks', freshness_score: 88, status: 'available' },
  },
  {
    id: 'demo-t3',
    donation_id: 'demo-3',
    status: 'completed',
    current_ngo_id: 'demo-n2',
    notified_ngo_ids: ['demo-n2', 'demo-n4'],
    retry_count: 1,
    timeout_at: null,
    error: null,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    donation: { food_item: 'Mixed Vegetables', restaurant_name: 'Barbeque Nation', city: 'Bengaluru', quantity: 200, meals: 400, category: 'Vegetables', freshness_score: 91, status: 'delivered' },
    current_ngo: { name: 'Akshaya Patra Foundation', city: 'Bengaluru', category: 'Midday Meal' },
  },
  {
    id: 'demo-t4',
    donation_id: 'demo-8',
    status: 'failed',
    current_ngo_id: null,
    notified_ngo_ids: ['demo-n1', 'demo-n3', 'demo-n5'],
    retry_count: 3,
    timeout_at: null,
    error: 'All NGOs timed out or rejected',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    donation: { food_item: 'Dal Makhani', restaurant_name: 'Behrouz Biryani', city: 'Bhopal', quantity: 160, meals: 320, category: 'Rice', freshness_score: 58, status: 'removed' },
  },
];

export const demoAdminStats = {
  restaurants: 6,
  ngos: 5,
  volunteers: 5,
  total_donations: 10,
  available: 4,
  claimed: 2,
  picked: 1,
  delivered: 2,
  removed: 1,
  total_meals: 2400,
  total_claims: 3,
  active_claims: 2,
  completed_claims: 1,
};
