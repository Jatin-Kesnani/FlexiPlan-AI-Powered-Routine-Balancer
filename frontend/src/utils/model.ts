// models.ts

export interface Hobby {
    id: number;
    name: string;
    category: string;
  }
  
  export interface User {
    id: number; // Unique identifier for each user
    username: string; // Username of the user
    email: string; // User's email address
    first_name: string;
    last_name: string;
    profile_picture: string | null;
  }
  
  export interface Task {
    id: number;
    task_name: string;
    description?: string | null;
    time_required?: string | null;  // Format: "HH:MM:SS"
    days_associated: string[];
    priority: string;
    created_at: string;  // ISO timestamp
    is_fixed_time: boolean;
    fixed_time_slot?: string | null;  // Format: "HH:MM:SS"
    user: number;
    routine?: number | null;
}

export interface TaskFormData {
  task_name: string;
  description: string | null;
  time_required: string | null;
  days_associated: string[];
  priority: string;
  is_fixed_time: boolean;
  fixed_time_slot: string | null;
}

export interface Activity {
  type: string;
  activity: string;
  end_time: string;
  start_time: string;
  is_completed: any;
  day: string;
}

export interface RoutineData {
  [day: string]: Activity[];
}

export interface UserRoutineResponse {
  routine_data?: RoutineData;
  error?: string;
}

export interface FriendRequest {
  id: number;
  user: number;       // ID of the user who initiated some action (may not be the sender)
  friend: number;     // ID of the other user in the friendship
  sender_username: string; // Username of the user who sent the request (as clarified)
  status: "Pending" | "Accepted" | "Rejected";
  created_at: string;  // ISO 8601 date string (e.g., "2025-02-22T16:15:27.898604Z")
  first_name: string;
  last_name: string;
  profile_picture: string | null;
}

export interface Message {
  id: number;
  content: string;
  is_user: boolean;
  created_at: string;  // ISO timestamp
}

export interface Conversation {
  id: number;
  user: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  messages: Message[];
}

export interface ChatResponse {
  response: string;
}

export interface ChatError {
  error: string;
}

export interface SuggestedMessage {
  text: string;
  description: string;
}

export const SUGGESTED_MESSAGES: SuggestedMessage[] = [
  {
    text: "I want to add a task to my profile",
    description: "Add a new task to your daily routine"
  },
  {
    text: "I want to add a hobby to my profile",
    description: "Add a new hobby to your interests"
  },
  {
    text: "Show me my current routine",
    description: "View your current daily schedule"
  },
  {
    text: "Help me balance my work and hobbies",
    description: "Get suggestions for better work-life balance"
  },
  {
    text: "I'm feeling stressed today",
    description: "Get personalized recommendations for stress relief"
  }
];