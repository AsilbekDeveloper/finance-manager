import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqnmvanmucgvngvbgjqa.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbm12YW5tdWNndm5ndmJnanFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTM1ODQsImV4cCI6MjA5MTY2OTU4NH0.uKS8sBJ3TrWLcad5KsR_WyVJOp_JPTw3hMb8WG4TXzA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);