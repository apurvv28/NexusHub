import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kvpluiwcgacqhmwpylwl.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cGx1aXdjZ2FjcWhtd3B5bHdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDYwNzgsImV4cCI6MjEwNDk4MjA3OH0.JzSsj4JxfB9Inl_9jR44TJhyZUdCtlVrIn_bOxCnMSg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
